export interface InstagramListModal {
  dialog: HTMLElement;
  scrollContainer: HTMLElement;
}

const getScrollableScore = (element: HTMLElement): number => {
  const style = window.getComputedStyle(element);
  const canScroll = element.scrollHeight - element.clientHeight;
  const overflow = `${style.overflowY} ${style.overflow}`;
  return canScroll > 24 && /(auto|scroll)/.test(overflow) ? canScroll : 0;
};

export function detectInstagramListModal(): InstagramListModal | undefined {
  const dialogs = [...document.querySelectorAll<HTMLElement>('div[role="dialog"]')];

  for (const dialog of dialogs.reverse()) {
    const candidates = [dialog, ...dialog.querySelectorAll<HTMLElement>("div")];
    const scrollContainer = candidates
      .map((element) => ({ element, score: getScrollableScore(element) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.element;

    if (scrollContainer) {
      return { dialog, scrollContainer };
    }
  }

  return undefined;
}
