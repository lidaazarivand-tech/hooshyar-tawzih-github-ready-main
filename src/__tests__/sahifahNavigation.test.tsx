import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ShiaBooksModal } from '../components/Books/ShiaBooksModal';
import { BooksShelfView } from '../components/Books/BooksShelfView';
import { ShiaBookCatalogView } from '../components/Books/ShiaBookCatalogView';
import { ShiaItemReaderView } from '../components/Books/ShiaItemReaderView';
import { SHIA_BOOKS_CONTENT } from '../data/shiaBooksData';
import sahifahData from '../data/sahifahFullData.json';

// Lightweight in-memory DOM mock for React 19 interactive integration tests
function setupMockDom() {
  class EventTarget {
    listeners: Record<string, Function[]> = {};
    addEventListener(type: string, fn: Function, options?: any) {
      const capture = typeof options === 'boolean' ? options : (options && options.capture);
      const key = (capture ? 'capture_' : 'bubble_') + type;
      (this.listeners[key] = this.listeners[key] || []).push(fn);
    }
    removeEventListener(type: string, fn: Function, options?: any) {
      const capture = typeof options === 'boolean' ? options : (options && options.capture);
      const key = (capture ? 'capture_' : 'bubble_') + type;
      if (this.listeners[key]) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
      }
    }
    dispatchEvent(event: any) {
      event.target = this;
      const path: any[] = [];
      let cur: any = this;
      while (cur) { path.unshift(cur); cur = cur.parentNode; }
      for (const node of path) {
        const captureListeners = node.listeners['capture_' + event.type] || [];
        for (const fn of captureListeners) {
          event.currentTarget = node;
          fn.call(node, event);
        }
      }
      cur = this;
      while (cur) {
        const bubbleListeners = cur.listeners['bubble_' + event.type] || [];
        for (const fn of bubbleListeners) {
          event.currentTarget = cur;
          fn.call(cur, event);
        }
        if (event.cancelBubble) break;
        cur = cur.parentNode;
      }
      return true;
    }
  }

  class Node extends EventTarget {
    nodeType: number = 1;
    childNodes: any[] = [];
    parentNode: any = null;
    ownerDocument: any = null;
    data?: string;
    nodeValue?: string;
    get children() { return this.childNodes.filter(n => n.nodeType === 1); }
    get textContent(): string {
      if (this.nodeType === 3) return this.data || '';
      return this.childNodes.map(n => n.textContent || '').join('');
    }
    set textContent(v: string) {
      if (this.nodeType === 3) {
        this.data = v;
        this.nodeValue = v;
        return;
      }
      this.childNodes = [];
      if (v) this.appendChild(new (Text as any)(v));
    }
    appendChild(child: any) {
      if (child.parentNode) child.parentNode.removeChild(child);
      this.childNodes.push(child);
      child.parentNode = this;
      return child;
    }
    removeChild(child: any) {
      const idx = this.childNodes.indexOf(child);
      if (idx >= 0) {
        this.childNodes.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }
    insertBefore(newChild: any, refChild: any) {
      if (!refChild) return this.appendChild(newChild);
      if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
      const idx = this.childNodes.indexOf(refChild);
      if (idx >= 0) {
        this.childNodes.splice(idx, 0, newChild);
        newChild.parentNode = this;
      } else {
        this.appendChild(newChild);
      }
      return newChild;
    }
  }

  class Element extends Node {
    tagName: string;
    nodeName: string;
    id: string = '';
    className: string = '';
    style: Record<string, string> = {};
    attributes: Record<string, string> = {};
    dataset: Record<string, string> = {};
    constructor(tagName: string) {
      super();
      this.nodeType = 1;
      this.tagName = tagName.toUpperCase();
      this.nodeName = this.tagName;
    }
    setAttribute(k: string, v: any) {
      this.attributes[k] = String(v);
      if (k === 'id') this.id = String(v);
      if (k === 'class' || k === 'className') this.className = String(v);
    }
    getAttribute(k: string) { return this.attributes[k] ?? null; }
    removeAttribute(k: string) {
      delete this.attributes[k];
      if (k === 'id') delete this.id;
    }
    hasAttribute(k: string) { return k in this.attributes; }
    click() {
      this.dispatchEvent({ type: 'click', bubbles: true, cancelable: true });
    }
    querySelector(selector: string): any {
      return this.querySelectorAll(selector)[0] || null;
    }
    querySelectorAll(selector: string): any[] {
      const results: any[] = [];
      const walk = (node: any) => {
        if (node.nodeType === 1) {
          if (selector.startsWith('#') && node.id === selector.slice(1)) {
            results.push(node);
          } else if (selector.startsWith('.') && (node.className || '').includes(selector.slice(1))) {
            results.push(node);
          } else if (node.tagName.toLowerCase() === selector.toLowerCase()) {
            results.push(node);
          }
          node.childNodes.forEach(walk);
        }
      };
      this.childNodes.forEach(walk);
      return results;
    }
    getElementById(id: string): any {
      return this.querySelector('#' + id);
    }
  }

  class HTMLElement extends Element {}
  class HTMLIFrameElement extends HTMLElement {}
  class HTMLDivElement extends HTMLElement {}
  class HTMLButtonElement extends HTMLElement {}
  class HTMLInputElement extends HTMLElement {}

  class Text extends Node {
    constructor(data: any) {
      super();
      this.nodeType = 3;
      this.data = String(data);
      this.nodeValue = this.data;
    }
  }

  class Comment extends Node {
    constructor() {
      super();
      this.nodeType = 8;
    }
  }

  class Document extends Element {
    documentElement: any;
    body: any;
    defaultView: any = null;
    ownerDocument: any = null;
    constructor() {
      super('#document');
      this.nodeType = 9;
      this.documentElement = new HTMLElement('html');
      this.body = new HTMLElement('body');
      this.appendChild(this.documentElement);
      this.documentElement.appendChild(this.body);
    }
    createElement(tag: string) {
      const el = new HTMLElement(tag);
      el.ownerDocument = this;
      return el;
    }
    createElementNS(_ns: string, tag: string) {
      return this.createElement(tag);
    }
    createTextNode(text: any) {
      const t = new Text(text);
      t.ownerDocument = this;
      return t;
    }
    createComment() {
      const c = new Comment();
      c.ownerDocument = this;
      return c;
    }
    getElementById(id: string) {
      return this.querySelector('#' + id);
    }
  }

  const doc = new Document();
  const win: any = {
    document: doc,
    defaultView: null,
    Node,
    Element,
    HTMLElement,
    HTMLIFrameElement,
    HTMLDivElement,
    HTMLButtonElement,
    HTMLInputElement,
    addEventListener: (t: string, fn: any, opt: any) => doc.addEventListener(t, fn, opt),
    removeEventListener: (t: string, fn: any, opt: any) => doc.removeEventListener(t, fn, opt),
    dispatchEvent: (e: any) => doc.dispatchEvent(e),
    location: { href: '' },
    navigator: { userAgent: 'node', clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }
  };
  doc.defaultView = win;
  win.defaultView = win;

  (globalThis as any).window = win;
  (globalThis as any).document = doc;
  (globalThis as any).Node = Node;
  (globalThis as any).Element = Element;
  (globalThis as any).HTMLElement = HTMLElement;
  (globalThis as any).HTMLIFrameElement = HTMLIFrameElement;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  return { doc, win };
}

describe('Sahifa al-Sajjadiyya Interactive Navigation Flow & Integration', () => {
  let doc: any;

  beforeEach(() => {
    const mock = setupMockDom();
    doc = mock.doc;
  });

  it('1. tapping Sahifah on BooksShelfView calls onSelectBook with "sahifah"', async () => {
    const onSelectBook = vi.fn();
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<BooksShelfView onSelectBook={onSelectBook} />);
    });

    const bodyText = doc.body.textContent;
    expect(bodyText).toContain('صحیفه سجادیه');

    const sahifahCard = doc.getElementById('book-shelf-item-sahifah');
    expect(sahifahCard).not.toBeNull();

    await act(async () => {
      sahifahCard.click();
    });

    expect(onSelectBook).toHaveBeenCalledWith('sahifah');
  });

  it('2. tapping Sahifah on shelf opens Sahifah Catalog (not stage-one preparation)', async () => {
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShiaBooksModal isOpen={true} onClose={() => {}} />);
    });

    // Tap Sahifah shelf button
    const sahifahBtn = doc.getElementById('book-shelf-item-sahifah');
    expect(sahifahBtn).not.toBeNull();
    await act(async () => {
      sahifahBtn.click();
    });

    const bodyText = doc.body.textContent;
    // Must NOT show preparation text
    expect(bodyText).not.toContain('محتوای این کتاب در حال آماده‌سازی است');
    // Must show Sahifah catalog header and author
    expect(bodyText).toContain('صحیفه سجادیه');
    expect(bodyText).toContain('امام زین‌العابدین');
    expect(bodyText).toContain('بازگشت به قفسه کتابخانه');

    // Check that supplication cards are rendered
    expect(doc.getElementById('item-card-sahifah_1')).not.toBeNull();
    expect(doc.getElementById('btn-back-to-shelf')).not.toBeNull();
  });

  it('3. Sahifa Catalog view displays 54 supplications and allows selecting items', async () => {
    const onSelectItem = vi.fn();
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ShiaBookCatalogView
          categoryId="sahifah"
          onSelectItem={onSelectItem}
          onBackToShelf={() => {}}
        />
      );
    });

    const bodyText = doc.body.textContent;
    expect(bodyText).toContain('التحمید لله');
    expect(bodyText).toContain('مکارم الأخلاق');

    // Click on Dua 1
    const itemCard = doc.getElementById('item-card-sahifah_1');
    expect(itemCard).not.toBeNull();
    await act(async () => {
      itemCard.click();
    });

    expect(onSelectItem).toHaveBeenCalledWith('sahifah_1');
  });

  it('4. selecting a Sahifa item opens ShiaItemReaderView and displays Arabic, Persian, and Mahdi Elahi Ghomshei attribution', async () => {
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ShiaItemReaderView
          categoryId="sahifah"
          itemId="sahifah_1"
          onBackToCatalog={() => {}}
          onSelectItem={() => {}}
        />
      );
    });

    const bodyText = doc.body.textContent;
    // Title
    expect(bodyText).toContain('دعای اول');
    expect(bodyText).toContain('التحمید لله');
    // Arabic text
    expect(bodyText).toContain('الْحَمْدُ لِلَّهِ الْأَوَّلِ بِلَا أَوَّلٍ كَانَ قَبْلَهُ');
    // Persian translation of Mahdi Elahi Ghomshei
    expect(bodyText).toContain('ستایش مخصوص خداست');
    // Authoritative translator attribution
    expect(bodyText).toContain('مهدی الهی قمشه‌ای');
  });

  it('5. complete interactive navigation flow: Shelf -> Sahifah Catalog -> Reader -> Back to Catalog -> Back to Shelf', async () => {
    const onClose = vi.fn();
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShiaBooksModal isOpen={true} onClose={onClose} />);
    });

    // 1. Initially on shelf
    const sahifahShelfBtn = doc.getElementById('book-shelf-item-sahifah');
    expect(sahifahShelfBtn).not.toBeNull();

    // 2. Click Sahifah to go to catalog
    await act(async () => {
      sahifahShelfBtn.click();
    });
    expect(doc.body.textContent).toContain('صحیفه سجادیه');
    expect(doc.getElementById('btn-back-to-shelf')).not.toBeNull();
    expect(doc.getElementById('item-card-sahifah_1')).not.toBeNull();

    // 3. Click first item (Dua 1) to open reader
    await act(async () => {
      doc.getElementById('item-card-sahifah_1').click();
    });
    expect(doc.body.textContent).toContain('الْحَمْدُ لِلَّهِ الْأَوَّلِ بِلَا أَوَّلٍ كَانَ قَبْلَهُ');
    expect(doc.body.textContent).toContain('مهدی الهی قمشه‌ای');
    expect(doc.getElementById('btn-back-to-catalog')).not.toBeNull();

    // 4. Click back to catalog
    await act(async () => {
      doc.getElementById('btn-back-to-catalog').click();
    });
    expect(doc.body.textContent).toContain('صحیفه سجادیه');
    expect(doc.getElementById('item-card-sahifah_1')).not.toBeNull();

    // 5. Click back to shelf
    await act(async () => {
      doc.getElementById('btn-back-to-shelf').click();
    });
    expect(doc.getElementById('book-shelf-item-sahifah')).not.toBeNull();
    expect(doc.getElementById('book-shelf-item-mafatih')).not.toBeNull();
  });

  it('6. verifies all 54 items exist offline in sahifahFullData.json and are wired into SHIA_BOOKS_CONTENT', () => {
    expect(sahifahData.length).toBe(54);
    expect(SHIA_BOOKS_CONTENT['sahifah'].length).toBe(54);
    expect(SHIA_BOOKS_CONTENT['sahifah'][0].id).toBe('sahifah_1');
    expect(SHIA_BOOKS_CONTENT['sahifah'][53].id).toBe('sahifah_54');
  });

  it('7. Tawzih al-Masa\'il opens active volume selector', async () => {
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShiaBooksModal isOpen={true} onClose={() => {}} />);
    });

    const tawzihBtn = doc.getElementById('book-shelf-item-tawzih');
    expect(tawzihBtn).not.toBeNull();
    await act(async () => {
      tawzihBtn.click();
    });
    expect(doc.body.textContent).toContain('توضیح المسائل جامع');
    expect(doc.body.textContent).toContain('انتخاب جلد کتاب');
    expect(doc.body.textContent).toContain('جلد ۱');
    expect(doc.body.textContent).toContain('جلد ۲');
    expect(doc.body.textContent).toContain('جلد ۳');
    expect(doc.body.textContent).toContain('جلد ۴');
  });
});
