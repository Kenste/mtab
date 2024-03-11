import { Config } from "src/newtab/scripts/config";
import { searchContainerEl, searchInputEl } from "../ui";

export const search = (config: Config, value: string) => {
  let searchUrl = "";

  switch (config.search.engine) {
    case "google":
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
      break;
    case "bing":
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(value)}`;
      break;
    case "duckduckgo":
      searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(value)}`;
      break;
  }

  const content = document.getElementById("content") as HTMLDivElement;
  content.classList.add("animate-page-shrink");

  const animationDuration = 350;

  setTimeout(() => {
    content.classList.remove("animate-page-shrink");
    content.style.opacity = "0%";
  }, animationDuration * 0.75);

  setTimeout(() => {
    window.location.href = searchUrl;
  }, animationDuration);
};

export const tryFocusSearch = (config: Config, e: KeyboardEvent) => {
  // in case already focused
  if (searchInputEl.matches(":focus")) return;

  focusSearch(config, e);
};

export const focusSearch = (config: Config, e: Event) => {
  searchContainerEl.classList.replace("border-transparent", config.search.focusedBorderClass);
  searchInputEl.focus();
  e.preventDefault();
};

export const unfocusSearch = (config: Config) => {
  searchInputEl.blur();

  searchContainerEl.classList.replace(config.search.focusedBorderClass, "border-transparent");
};
