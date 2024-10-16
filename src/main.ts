import { Plugin, Setting, View, MarkdownView } from "obsidian";

// Remember to rename these classes and interfaces!

interface KeyboardEnhancerSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: KeyboardEnhancerSettings = {
	mySetting: "default",
};

export default class KeyboardEnhancerPlugin extends Plugin {
	settings: KeyboardEnhancerSettings;

	isFileExplorerActive(): boolean {
		const view = this.app.workspace.getActiveViewOfType(View);
		return view?.getViewType() === "file-explorer";
	}

	isMarkdownEditorActiveAndInPreviewMode(): boolean {
		const view = this.app.workspace.getActiveViewOfType(View);
		return (
			view?.getViewType() === "markdown" &&
			view?.currentMode.type === "preview"
		);
	}

	inSplit(e, split): boolean {
		while (e) {
			if (e === split) return true;
			e = e.parent;
		}
		return false;
	}

	focusViewByType(viewType: string) {
		const view = this.app.workspace.getLeavesOfType(viewType)[0];
		if (!view) return;

		if (this.inSplit(view, this.app.workspace.rightSplit))
			this.app.workspace.rightSplit.expand();
		else if (this.inSplit(view, this.app.workspace.leftSplit))
			this.app.workspace.leftSplit.expand();
		this.app.workspace.setActiveLeaf(view, { focus: true });
	}
	// "file-properties", "outline", "localgraph", "all-properties", "tag", "backlink",
	// "recent-files", "bookmarks", "search"

	vimiumCompatibleView: string[] = [
		"external-links-view",
		"file-properties",
		"localgraph",
		"tag",
		"all-properties",
		"outgoing-link",
		"recent-files",
		"bookmarks",
		"outline",
		"backlink",
	];

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "focus-note",
			name: "Focus note",
			callback: async () => {
				let root = this.app.workspace.rootSplit;
				while (root.type !== "tabs") root = root.children[0];
				this.app.workspace.setActiveLeaf(
					root.children[root.currentTab],
					{ focus: true }
				);
			},
		});
		this.addCommand({
			id: "focus-local-graph",
			name: "Focus local graph view",
			callback: async () => {
				this.focusViewByType("localgraph");
			},
		});
		this.addCommand({
			id: "focus-external-links",
			name: "Focus external links view",
			callback: async () => {
				this.focusViewByType("external-links-view");
			},
		});

		this.registerDomEvent(window, "keydown", async (event) => {
			if (event.key === " ") {
				if (this.isFileExplorerActive())
					await this.app.commands.executeCommandById(
						"file-manager:toggle-select"
					);
			}
			if (event.key === "f") {
				const viewType =
					this.app.workspace
						.getActiveViewOfType(View)
						?.getViewType() ?? "";
				if (
					this.isMarkdownEditorActiveAndInPreviewMode() ||
					this.vimiumCompatibleView.includes(viewType)
				) {
					await this.app.commands.executeCommandById(
						"vimium:show-markers"
					);
				}
			}
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
