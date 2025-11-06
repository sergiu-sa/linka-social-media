/**
 * @file ui.ts
 * @description Utility functions for DOM manipulation and environment checks.
 * @note This code is taken from a boiler-plate created by Monde Sineke
 * @author Your Name
 */

/**
 * Creates a DOM node from an HTML string template.
 *
 * @param template - A string containing valid HTML markup.
 * @returns The first child node of the parsed HTML body, or `null` if the template is empty or invalid.
 *
 * @example
 * ```typescript
 * const element = createHTML('<div>Hello, world!</div>');
 * document.body.appendChild(element);
 * ```
 */
export function createHTML(template: string) {
  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(template, 'text/html');
  return parsedDocument.body.firstChild;
}

function removeAllChildNodes(parent: HTMLElement) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

export function clearNode(el: HTMLElement) {
  removeAllChildNodes(el);
}

/**
 * Retrieves DOM elements based on an array of IDs from a specified container.
 *
 * @param {string[]} ids - An array of string IDs to query within the container. The order matters.
 * @param {HTMLElement} container - The container element to search within. You should default to Document. We can avoid testing complications by passing this in as a element. This ensures that its' a pure function
 * @returns {HTMLElement[]} An array of DOM elements corresponding to the provided IDs. The order matters.
 * @throws {Error} Throws an error if any of the IDs are not strings.
 * @author S3ak
 * @description We need a function to check that all the DOM elements that will be maniupulated by our javascript are present. This is a rudementry dependency check. The reason we have this code is to make testing the code easier to debug;
 */
export const getDOMElements = (
  ids: string[] = [],
  container: HTMLElement | Document = document
): HTMLElement[] | [] => {
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
    throw new Error('All IDs must be strings');
  }

  let DOMElements: HTMLElement[] = [];

  ids.forEach((id) => {
    const el = container.querySelector(`${id}`);
    if (!el) {
      throw new Error(
        `Element with selector '${id}' not found in the container.`
      );
    }

    DOMElements.push(el as HTMLElement);
  });

  if (DOMElements.length === 0) {
    console.error(
      new Error(
        "Please check the HTML for missing DOM HTML element with the id='js-*'"
      )
    );

    return [];
  }

  return DOMElements;
};

/**
 * Checks if all provided elements are valid HTMLElements and if the array is not empty.
 *
 * @param {HTMLElement[]} elements - An array of HTMLElements to check.
 * @returns {boolean} - Returns true if the array is not empty and all elements are valid HTMLElements.
 * @throws {Error} - Throws an error if any element in the array is not a valid HTMLElement.
 */
export const areDOMElementPresent = (elements: HTMLElement[] = []) => {
  if (
    !Array.isArray(elements) ||
    !elements.every((el) => el instanceof HTMLElement)
  ) {
    throw new Error('All elements must be valid HTMLElements');
  }

  return elements.length > 0;
};

/**
 * Determines if the current execution environment is a web browser.
 *
 * @returns {boolean} `true` if running in a browser (i.e., `window` and `window.document` are defined), otherwise `false`.
 */
export function isBrowser() {
  return (
    typeof window !== 'undefined' && typeof window.document !== 'undefined'
  );
}
