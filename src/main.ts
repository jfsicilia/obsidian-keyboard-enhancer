import {
	Notice,
	Plugin,
	App,
	PluginSettingTab,
	Setting,
	View,
	WorkspaceItem,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface KeyboardEnhancerSettings {
	enableEnhancer: boolean;
}

const DEFAULT_SETTINGS: KeyboardEnhancerSettings = {
	enableEnhancer: true,
};

// "file-properties", "outline", "localgraph", "all-properties", "tag", "backlink",
// "recent-files", "bookmarks", "search"
// const VIMIUM_COMPATIBLE_VIEW: string[] = [
// 	"external-links-view",
// 	"file-explorer",
// 	"file-properties",
// 	"localgraph",
// 	"tag",
// 	"all-properties",
// 	"outline",
// 	"outgoing-link",
// 	"recent-files",
// 	"bookmarks",
// 	"backlink",
// ];

// const VIMIUM_NOT_AVAILABLE_CLASSNAMES: string[] = [
// 	"cm-content",
// 	"inline-title",
// ];

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

	inSplit(e: WorkspaceItem, split: WorkspaceItem): boolean {
		while (e) {
			console.log(e);
			console.log(split);
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

	async showVimiumMarkers() {
		await this.app.commands.executeCommandById("vimium:show-markers");
	}

	hideVimiumMarkers() {
		const escEvent = new KeyboardEvent("keydown", {
			key: "Escape",
			code: "Escape",
			keyCode: 27, // keyCode for 'Escape'
			bubbles: true,
			cancelable: true,
		});

		// Dispatch the 'Escape' event on the document
		document.dispatchEvent(escEvent);
	}

	async onload() {
		const app = this.app;
		const workspace = app.workspace;

		await this.loadSettings();
		this.addSettingTab(new KeyboardEnhancerSettingTab(this.app, this));

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
		this.addCommand({
			id: "toggle-keyboard-enhancer",
			name: "Toggles on/off keyboard enhancer",
			callback: async () => {
				this.settings.enableEnhancer = !this.settings.enableEnhancer;
				this.saveData(this.settings);
				new Notice(
					`Keyboard Enhancer is now ${
						this.settings.enableEnhancer ? "enabled" : "disabled"
					}`
				);
			},
		});

		this.registerDomEvent(window, "keydown", async (event) => {
			// Do nothing if keyboard enhancer is disabled
			if (!this.settings.enableEnhancer) return;

			if (event.key === " ") {
				if (this.isFileExplorerActive())
					await app.commands.executeCommandById(
						"file-manager:toggle-select"
					);
			}
			if (event.key === ";") {
				const focusedElem = document.activeElement;
				// Do nothing if focused element is an input or contenteditable
				if (focusedElem?.tagName.toLowerCase() === "input") return;
				if (focusedElem?.contentEditable === "true") return;
				// Activate vimium if not showing markers, deactivate if showing
				!document.querySelector(".vimium-container")
					? await this.showVimiumMarkers()
					: this.hideVimiumMarkers();

				// if (
				// 	VIMIUM_NOT_AVAILABLE_CLASSNAMES.some((classname) =>
				// 		active?.classList.contains(classname)
				// 	)
				// )
				// return;

				// if (!document.querySelector(".vimium-container"))
				// 	await this.showVimiumMarkers();
				// else if (!document.querySelector(".vimium-marker-char-match"))
				// 	this.hideVimiumMarkers();

				// const viewType =
				// 	workspace.getActiveViewOfType(View)?.getViewType() ?? "";
				// if (
				// 	this.isMarkdownEditorActiveAndInPreviewMode() ||
				// 	VIMIUM_COMPATIBLE_VIEW.includes(viewType)
				// ) {
				// 	if (!document.querySelector(".vimium-container"))
				// 		await this.showVimiumMarkers();
				// 	else if (
				// 		!document.querySelector(".vimium-marker-char-match")
				// 	)
				// 		this.hideVimiumMarkers();
				// }
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

export class KeyboardEnhancerSettingTab extends PluginSettingTab {
	plugin: KeyboardEnhancerPlugin;

	constructor(app: App, plugin: KeyboardEnhancerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Enable Keyboard Enhancer")
			.setDesc("Allows to use keyboard shortcuts to navigate the app")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableEnhancer)
					.onChange(async (value) => {
						this.plugin.settings.enableEnhancer = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
