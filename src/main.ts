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

export default class KeyboardEnhancerPlugin extends Plugin {
	settings: KeyboardEnhancerSettings;

	isFileExplorerActive(): boolean {
		const view = this.app.workspace.getActiveViewOfType(View);
		return view?.getViewType() === "file-explorer";
	}

	/**
	 * Check if an element `e` is a child of another `split`.
	 */
	inSplit(e: WorkspaceItem, split: WorkspaceItem): boolean {
		while (e) {
			if (e === split) return true;
			e = e.parent;
		}
		return false;
	}

	/**
	 * Focuses a view by its type. If the view is in the right or left split,
	 * it expands the split to show the view.
	 */
	focusViewByType(viewType: string) {
		const view = this.app.workspace.getLeavesOfType(viewType)[0];
		if (!view) return;

		if (this.inSplit(view, this.app.workspace.rightSplit))
			this.app.workspace.rightSplit.expand();
		else if (this.inSplit(view, this.app.workspace.leftSplit))
			this.app.workspace.leftSplit.expand();
		this.app.workspace.setActiveLeaf(view, { focus: true });
	}

	/**
	 * Focuses the note in the root split. If the split is divided into more
	 * splits, if finds the first split that is a tab and focuses the current
	 * tab.
	 */
	focusNote() {
		let root = this.app.workspace.rootSplit;
		while (root.type !== "tabs") root = root.children[0];
		this.app.workspace.setActiveLeaf(root.children[root.currentTab], {
			focus: true,
		});
	}

	/**
	 * Show vimium markers.
	 */
	async showVimiumMarkers() {
		await this.app.commands.executeCommandById("vimium:show-markers");
	}

    /**
     * Set the active leaf to read mode.
     */
    setReadMode() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) return;
        let viewState = activeLeaf.getViewState();
        viewState.state!.mode = "preview";
        activeLeaf.setViewState(viewState);
    }

	/**
	 * Hide vimium markers.
	 */
	hideVimiumMarkers() {
		// Hack to simulate pressing the 'Escape' key, to hide vimium markers
		const escEvent = new KeyboardEvent("keydown", {
			key: "Escape",
			code: "Escape",
			keyCode: 27, // keyCode for 'Escape'
			bubbles: true,
			cancelable: true,
		});
		document.dispatchEvent(escEvent);
	}

	async onload() {
		const app = this.app;

		await this.loadSettings();
		this.addSettingTab(new KeyboardEnhancerSettingTab(app, this));

		this.addCommand({
			id: "focus-note",
			name: "Focus note",
			callback: async () => {
				this.focusNote();
			},
		});
		this.addCommand({
			id: "focus-calendar",
			name: "Focus calendar view",
			callback: async () => {
				this.focusViewByType("calendar");
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
        // Forces the active leaf to be in preview mode.
		this.addCommand({
			id: "set-read-mode",
			name: "Set read mode",
			callback: async () => {
                this.setReadMode();
			},
		});

		this.registerDomEvent(window, "keydown", async (event) => {
			// Do nothing if keyboard enhancer is disabled
			if (!this.settings.enableEnhancer) return;

            switch (event.key) {
                case " ":   // Toggle selection in file explorer.
                    if (!this.isFileExplorerActive()) return;
                    await app.commands.executeCommandById(
                        "file-manager:toggle-select"
                    );
                    break;
                case ";":   // Toggle vimium markers.
                    const focusedElem = document.activeElement;
                    ;const vimMode = app.workspace.activeLeaf.view.editor.cm.cm.state.vim.mode;
                    // Do nothing if focused element is an input or contenteditable
                    if (focusedElem?.tagName.toLowerCase() === "input") return;
                    if (focusedElem?.contentEditable === "true") return;
                    // Activate vimium if not showing markers, deactivate if showing
                    !document.querySelector(".vimium-container")
                        ? await this.showVimiumMarkers()
                        : this.hideVimiumMarkers();
                    break;
                case "Enter":   // Create/Open folder note of active file explorer folder.
                    if (!this.isFileExplorerActive()) return;
                    // If ctrl key is pressed, create a new folder note.
                    if (event.ctrlKey)
                        await app.commands.executeCommandById(
                            "folder-notes:create-markdown-folder-note-for-active-file-explorer-folder"
                        );
                    await app.commands.executeCommandById(
                        "folder-notes:open-folder-note-of-active-file-explorer-folder"
                    );
                    break;
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
