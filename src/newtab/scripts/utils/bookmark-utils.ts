import {
  AnimationBookmarkType,
  AnimationInitialType,
  BookmarkTiming,
  Config,
  UIStyle,
  UserDefinedBookmark
} from "src/newtab/scripts/config";
import { bookmarksContainerEl, bookmarkSearchInputEl, contentEl } from "src/newtab/scripts/ui";
import { focusElementBorder, unfocusElementBorder } from "src/newtab/scripts/utils/focus-utils";
import { getUserAgent } from "src/util-scripts/user-agent";

export const openBookmark = (
  bookmarkUrl: string,
  animationsEnabled: boolean,
  animationsType: AnimationBookmarkType,
  openInNewTab: boolean = false
) => {
  if (openInNewTab) {
    window.open(bookmarkUrl, "_blank");
    bookmarkSearchInputEl.value = "";

    return;
  }

  if (animationsEnabled) {
    contentEl.classList.add(animationsType);
    const computedStyle = getComputedStyle(contentEl);
    const animationDuration = parseFloat(computedStyle.animationDuration) * 1000;

    setTimeout(() => {
      contentEl.style.opacity = "0%";
    }, animationDuration - 10);

    setTimeout(() => {
      window.location.href = bookmarkUrl;
    }, animationDuration + 20);
  } else {
    window.location.href = bookmarkUrl;
  }
};

export const openBookmarkFolder = (
  chromeBookmarks: chrome.bookmarks.BookmarkTreeNode[],
  folderToLeaveId: string,
  newFolderId: string,
  config: Config,
  showBackButton: boolean
) => {
  // prettier-ignore
  const oldContainerEl = document.getElementById(`bookmark-folder-container-${folderToLeaveId}`) as HTMLDivElement;

  // prettier-ignore
  let newFolderChildren: chrome.bookmarks.BookmarkTreeNode[] = [];

  if (showBackButton) {
    newFolderChildren = chromeBookmarks.filter((bookmark) => bookmark.parentId === newFolderId);
  } else {
    const chromeBookmarksTree = buildChromeBookmarksTree(chromeBookmarks);
    newFolderChildren = chromeBookmarksTree;
  }

  if (config.animations.enabled) {
    oldContainerEl.classList.add(config.animations.bookmarkType);
    const computedStyle = getComputedStyle(oldContainerEl);
    const animationDuration = parseFloat(computedStyle.animationDuration) * 1000;

    setTimeout(() => {
      oldContainerEl.style.opacity = "0%";
    }, animationDuration - 10);

    setTimeout(() => {
      oldContainerEl.parentNode!.removeChild(oldContainerEl);
      renderDefaultBlockyBookmarksNodes(
        newFolderId,
        newFolderChildren,
        chromeBookmarks,
        config,
        showBackButton
      );
    }, animationDuration + 20);
  } else {
    oldContainerEl.parentNode!.removeChild(oldContainerEl);
    renderDefaultBlockyBookmarksNodes(
      newFolderId,
      newFolderChildren,
      chromeBookmarks,
      config,
      showBackButton
    );
  }
};

export const renderBlockBookmark = (
  containerEl: HTMLDivElement,
  bookmarkTiming: BookmarkTiming,
  bookmarksLength: number,
  bookmarkIndex: number,
  bookmarkName: string,
  bookmarkId: string,
  bookmarkColor: string,
  bookmarkIconColor: string | null,
  bookmarkIconType: string | null,
  bookmarkIconHTML: string,
  uiStyle: UIStyle,
  animationsEnabled: boolean,
  animationsInitialType: AnimationInitialType
) => {
  let delay = 0;

  if (bookmarkTiming === "uniform") delay = 150;
  else if (bookmarkTiming === "left") delay = (bookmarkIndex + 2) * 50;
  else if (bookmarkTiming === "right") delay = (bookmarksLength + 2 - bookmarkIndex) * 50;

  let iconHTML = bookmarkIconHTML;
  let iconSizeClass = "";

  if (bookmarkIconType) {
    if (bookmarkIconType.startsWith("ri-")) {
      iconHTML = `<i class="${bookmarkIconType}"></i>`;
      iconSizeClass = "text-4xl md:text-6xl";
    } else if (bookmarkIconType.startsWith("nf-")) {
      iconHTML = `<i class="nf ${bookmarkIconType}"></i>`;
      iconSizeClass = "text-5xl md:text-7xl";
    } else if (bookmarkIconType.startsWith("url-")) {
      const src = bookmarkIconType.split("url-")[1];
      iconHTML = `<img class="w-10 md:w-14" src="${src}" />`;
    }
  }

  // prettier-ignore
  containerEl.innerHTML += `
    <button id="bookmark-${bookmarkId}-${bookmarkIndex}" class="relative duration-[250ms] ease-out bg-foreground cursor-pointer ${
      uiStyle === "glass" ? "glass-effect" : ""
    } rounded-md h-bookmark overflow-hidden ${
      animationsEnabled ? `${animationsInitialType} opacity-0 outline-none` : ""
    }" ${animationsEnabled ? `style="animation-delay: ${delay}ms;"` : ""}>
      <div id="bookmark-${bookmarkId}-${bookmarkIndex}-border" class="absolute w-full h-full border-2 border-transparent rounded-md"></div>
      <div class="absolute w-full h-full hover:bg-white/20"></div>
      <div class="p-1 md:p-2 grid place-items-center h-full">
        <div class="bookmark-icon${iconSizeClass && " " + iconSizeClass}"${bookmarkIconColor && ` style="color: ${bookmarkIconColor};"`}>
          ${iconHTML}
        </div>
        <div>${bookmarkName}</div>
      </div>
    </button>
  `;
};

export const bindActionsToBlockNode = (
  node: chrome.bookmarks.BookmarkTreeNode,
  index: number,
  chromeBookmarks: chrome.bookmarks.BookmarkTreeNode[],
  config: Config
) => {
  // if default-blocky or user-defined
  const identifier = node.id ? node.id : (node as unknown as UserDefinedBookmark).name;

  // prettier-ignore
  const bookmarkEl = document.getElementById(`bookmark-${identifier}-${index}`) as HTMLButtonElement;
  // prettier-ignore
  const bookmarkBorderEl = document.getElementById(`bookmark-${identifier}-${index}-border`) as HTMLDivElement;

  if (bookmarkEl && config.animations.enabled) {
    const computedStyle = window.getComputedStyle(bookmarkEl);
    const animationDuration = parseFloat(computedStyle.animationDuration) * 1000;
    bookmarkEl.addEventListener(
      "animationstart",
      () => {
        // Fix weird flickering issue on firefox
        setTimeout(() => {
          bookmarkEl.classList.remove("opacity-0");
          // fix bookmarks animations replaying after bookmark search esc
          bookmarkEl.classList.remove(config.animations.initialType);
        }, animationDuration * 0.75); // needs to be less than 1
      },
      {
        once: true
      }
    );

    // Fix bookmarks disappearing if user leaves tab too quickly
    document.addEventListener("visibilitychange", () => {
      bookmarkEl.classList.remove("opacity-0");
    });
  }

  const isFolder = node.children && node.children!.length > 0;
  if (isFolder) {
    bookmarkEl.onclick = () => {
      openBookmarkFolder(chromeBookmarks, node.parentId!, node.id, config, true);
    };
  } else {
    bookmarkEl.onclick = (e) => {
      if (e.ctrlKey) {
        openBookmark(node.url!, config.animations.enabled, config.animations.bookmarkType, true);
      } else {
        openBookmark(node.url!, config.animations.enabled, config.animations.bookmarkType);
      }
    };
  }

  bookmarkEl.addEventListener("blur", () => unfocusElementBorder(bookmarkBorderEl));
  bookmarkEl.addEventListener("focus", (e) =>
    focusElementBorder(bookmarkBorderEl, config.search.focusedBorderColor, e)
  );
};

export const bindActionsToBackButton = (
  folderId: string,
  chromeBookmarks: chrome.bookmarks.BookmarkTreeNode[],
  config: Config
) => {
  // prettier-ignore
  const backButtonEl = document.getElementById(`bookmark-folder-${folderId}-back-button`) as HTMLButtonElement;
  // prettier-ignore
  const backButtonBorderEl = document.getElementById(`bookmark-folder-${folderId}-border`) as HTMLDivElement;

  if (backButtonEl && config.animations.enabled) {
    const computedStyle = window.getComputedStyle(backButtonEl);
    const animationDuration = parseFloat(computedStyle.animationDuration) * 1000;
    backButtonEl.addEventListener(
      "animationstart",
      () => {
        setTimeout(() => {
          backButtonEl.classList.remove("opacity-0");
          backButtonEl.classList.remove(config.animations.initialType);
        }, animationDuration * 0.75); // needs to be less than 1
      },
      {
        once: true
      }
    );

    document.addEventListener("visibilitychange", () => {
      backButtonEl.classList.remove("opacity-0");
    });
  }

  backButtonEl.onclick = () => {
    const folderNode = chromeBookmarks.find((bookmark) => bookmark.id === folderId)!;
    // prettier-ignore
    const parentFolderNode = chromeBookmarks.find((bookmark) => bookmark.id === folderNode.parentId)!;

    const isTopLevel = typeof folderNode === "undefined";
    const isParentTopLevel = typeof parentFolderNode === "undefined";
    if (isTopLevel) return;

    openBookmarkFolder(chromeBookmarks, folderId, folderNode.parentId!, config, !isParentTopLevel);
  };

  backButtonEl.addEventListener("blur", () => unfocusElementBorder(backButtonBorderEl));
  backButtonEl.addEventListener("focus", (e) =>
    focusElementBorder(backButtonBorderEl, config.search.focusedBorderColor, e)
  );
};

export const renderBlockBookmarkFolder = (
  containerEl: HTMLDivElement,
  bookmarkTiming: BookmarkTiming,
  bookmarksLength: number,
  bookmarkIndex: number,
  bookmarkName: string,
  bookmarkId: string,
  bookmarkColor: string,
  bookmarkIconColor: string | null,
  bookmarkIconType: string | null,
  bookmarkIconHTML: string,
  uiStyle: UIStyle,
  animationsEnabled: boolean,
  animationsInitialType: AnimationInitialType
) => {
  let delay = 0;

  if (bookmarkTiming === "uniform") delay = 150;
  else if (bookmarkTiming === "left") delay = (bookmarkIndex + 2) * 50;
  else if (bookmarkTiming === "right") delay = (bookmarksLength + 2 - bookmarkIndex) * 50;

  let iconHTML = bookmarkIconHTML;
  let iconSizeClass = "";

  if (bookmarkIconType) {
    if (bookmarkIconType.startsWith("ri-")) {
      iconHTML = `<i class="${bookmarkIconType}"></i>`;
      iconSizeClass = "text-4xl md:text-6xl";
    } else if (bookmarkIconType.startsWith("nf-")) {
      iconHTML = `<i class="nf ${bookmarkIconType}"></i>`;
      iconSizeClass = "text-5xl md:text-7xl";
    } else if (bookmarkIconType.startsWith("url-")) {
      const src = bookmarkIconType.split("url-")[1];
      iconHTML = `<img class="w-10 md:w-14" src="${src}" />`;
    }
  }

  // prettier-ignore
  containerEl.innerHTML += `
    <button id="bookmark-${bookmarkId}-${bookmarkIndex}" class="relative duration-[250ms] ease-out bg-foreground cursor-pointer ${uiStyle === "glass" ? "glass-effect" : ""} rounded-md h-bookmark overflow-hidden ${animationsEnabled ? `${animationsInitialType} opacity-0 outline-none` : ""}" ${animationsEnabled ? `style="animation-delay: ${delay}ms;"` : ""}>
      <div id="bookmark-${bookmarkId}-${bookmarkIndex}-border" class="absolute w-full h-full border-2 border-transparent rounded-md"></div>
      <div class="absolute w-full h-full hover:bg-white/20"></div>
      <div class="p-1 md:p-2 grid place-items-center h-full">
        <div class="bookmark-icon${iconSizeClass && " " + iconSizeClass}"${bookmarkIconColor && ` style="color: ${bookmarkIconColor};"`}>
          ${iconHTML}
        </div>
        <div>${bookmarkName}</div>
      </div>
    </button>
  `;
};

export const buildChromeBookmarksTree = (chromeBookmarks: chrome.bookmarks.BookmarkTreeNode[]) => {
  const bookmarksMap = new Map<string, chrome.bookmarks.BookmarkTreeNode>();
  const rootNodes: chrome.bookmarks.BookmarkTreeNode[] = [];

  chromeBookmarks.forEach((item) => {
    item.children = [];
    bookmarksMap.set(item.id, item);
  });

  chromeBookmarks.forEach((item) => {
    if (!bookmarksMap.has(item.parentId!)) {
      rootNodes.push(item);
    } else {
      const parent = bookmarksMap.get(item.parentId!);
      if (parent) {
        parent.children!.push(item);
      }
    }
  });

  return rootNodes;
};

export const renderDefaultBlockyBookmarksNodes = (
  folderId: string,
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  chromeBookmarks: chrome.bookmarks.BookmarkTreeNode[],
  config: Config,
  showBackButton: boolean
) => {
  let delay = 0;
  if (config.animations.bookmarkTiming === "uniform") delay = 150;
  else delay = (nodes.length + 3) * 50;

  bookmarksContainerEl.innerHTML += `<div id="bookmark-folder-container-${folderId}" class="w-full grid gap-2 grid-rows-[auto_max-content]"></div>`;
  // prettier-ignore
  const containerEl = document.getElementById(`bookmark-folder-container-${folderId}`) as HTMLDivElement;

  containerEl.innerHTML += `<div id="bookmark-folder-nodes-container-${folderId}" class="w-full grid gap-2 default-blocky-bookmarks-cols"></div>`;
  containerEl.innerHTML += `<div id="bookmark-folder-actions-container-${folderId}" class="w-full grid place-items-center"></div>`;
  // prettier-ignore
  const nodesContainerEl = document.getElementById(`bookmark-folder-nodes-container-${folderId}`) as HTMLDivElement;
  // prettier-ignore
  const actionsContainerEl = document.getElementById(`bookmark-folder-actions-container-${folderId}`) as HTMLDivElement;

  if (showBackButton) {
    // prettier-ignore
    actionsContainerEl.innerHTML += `
      <button id="bookmark-folder-${folderId}-back-button" class="relative duration-[250ms] ease-out bg-foreground cursor-pointer ${config.ui.style === "glass" ? "glass-effect" : ""} rounded-md h-9 md:h-12 px-1 md:px-2 overflow-hidden ${config.animations.enabled ? `${config.animations.initialType} opacity-0 outline-none` : ""}" ${config.animations.enabled ? `style="animation-delay: ${delay}ms;"` : ""}>
        <div id="bookmark-folder-${folderId}-border" class="absolute top-0 left-0 w-full h-9 md:h-12 border-2 border-transparent rounded-md"></div>
        <div class="absolute top-0 left-0 w-full h-9 md:h-12 hover:bg-white/20"></div>
        <div class="grid grid-cols-[max-content_auto] gap-2 font-message text-base md:text-2xl w-full" style="color: ${config.message.textColor};">
          <i class="ri-arrow-left-line"></i>
          <span>Back</span>
        </div>
      </button>
    `
  } else {
    // prettier-ignore
    actionsContainerEl.innerHTML += `<div class="relative rounded-md h-9 md:h-12 px-1 md:px-2 overflow-hidden opacity-0 outline-none"></div>`
  }

  const userAgent = getUserAgent();

  nodes.forEach((node, index) => {
    // if has children item is a folder
    const isFolder = node.children!.length > 0;

    if (isFolder) {
      const folder = node;

      renderBlockBookmarkFolder(
        nodesContainerEl,
        config.animations.bookmarkTiming,
        nodes.length,
        index,
        folder.title,
        folder.id,
        config.bookmarks.defaultBlockyColor,
        config.bookmarks.defaultBlockyColor,
        "ri-folder-fill",
        "",
        config.ui.style,
        config.animations.enabled,
        config.animations.initialType
      );
    } else {
      renderBlockBookmark(
        nodesContainerEl,
        config.animations.bookmarkTiming,
        nodes.length,
        index,
        node.title,
        node.id,
        config.bookmarks.defaultBlockyColor,
        null,
        null,
        // prettier-ignore
        `<img class="w-10 md:w-14" src="${userAgent === "firefox" ? `${new URL(node.url!).origin}/favicon.ico` : `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(node.url as string)}&size=${64}`}" />`,
        config.ui.style,
        config.animations.enabled,
        config.animations.initialType
      );
    }
  });

  config.animations &&
    nodes.forEach((node, index) => {
      const isFolder = node.children!.length > 0;

      if (isFolder) {
        const folder = node;
        bindActionsToBlockNode(folder, index, chromeBookmarks, config);
      } else {
        bindActionsToBlockNode(node, index, chromeBookmarks, config);
      }
    });

  if (showBackButton) bindActionsToBackButton(nodes[0].parentId!, chromeBookmarks, config);
};
