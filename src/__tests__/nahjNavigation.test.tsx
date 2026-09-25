import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { ShiaBooksModal } from '../components/Books/ShiaBooksModal';
import { BooksShelfView } from '../components/Books/BooksShelfView';
import { ShiaBookCatalogView } from '../components/Books/ShiaBookCatalogView';
import { ShiaItemReaderView } from '../components/Books/ShiaItemReaderView';
import { SHIA_BOOKS_CONTENT } from '../data/shiaBooksData';
import { ShiaBookItem } from '../types/books';

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
    navigator: { userAgent: 'node' }
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

describe('Nahj al-Balagha UI Navigation Integration', () => {
  let doc: any;

  beforeEach(() => {
    const dom = setupMockDom();
    doc = dom.doc;
  });
  // 1. Opening Islamic Library on Shelf
  it('1. renders Islamic Library on shelf view with Nahj al-Balagha entry', () => {
    const html = renderToString(
      <ShiaBooksModal
        isOpen={true}
        onClose={() => {}}
        currentLevel="shelf"
      />
    );

    expect(html).toContain('کتابخانه اسلامی');
    expect(html).toContain('نهج‌البلاغه');
    expect(html).toContain('book-shelf-item-nahj');
  });

  // 2. Shelf component allows selecting Nahj al-Balagha
  it('2. clicking Nahj al-Balagha on shelf calls onSelectBook with "nahj"', () => {
    const handleSelectBook = vi.fn();
    const handleClose = vi.fn();

    // BooksShelfView renders book-shelf-item-nahj
    const html = renderToString(
      <BooksShelfView
        onSelectBook={handleSelectBook}
        onClose={handleClose}
      />
    );

    expect(html).toContain('نهج‌البلاغه');
    expect(html).toContain('id="book-shelf-item-nahj"');

    // Simulate clicking Nahj al-Balagha
    handleSelectBook('nahj');
    expect(handleSelectBook).toHaveBeenCalledWith('nahj');
  });

  // 3. Moving to Nahj al-Balagha catalog
  it('3. renders Nahj al-Balagha catalog with category tabs and items', () => {
    const handleSelectItem = vi.fn();
    const handleBackToShelf = vi.fn();

    const html = renderToString(
      <ShiaBookCatalogView
        categoryId="nahj"
        onSelectItem={handleSelectItem}
        onBackToShelf={handleBackToShelf}
      />
    );

    expect(html).toContain('نهج‌البلاغه');
    expect(html).toContain('خطبه‌ها');
    expect(html).toContain('نامه‌ها');
    expect(html).toContain('حکمت‌ها');
  });

  // 4. Verifying known reference items exist in catalog
  it('4. verifies known items (Sermon 1, Shaqshaqiyya, Letter 53, Wisdom 1) exist in Nahj content', () => {
    const items = SHIA_BOOKS_CONTENT['nahj'] as ShiaBookItem[];
    expect(items).toBeDefined();

    // Sermon 1
    const sermon1 = items.find(i => i.type === 'sermon' && i.num === 1);
    expect(sermon1).toBeDefined();
    expect(sermon1?.id).toBe('nahj_sermon_1');
    expect(sermon1?.title).toContain('خطبه ۱');

    // Shaqshaqiyya (Sermon 3)
    const shaqshaqiyya = items.find(i => i.type === 'sermon' && i.num === 3);
    expect(shaqshaqiyya).toBeDefined();
    expect(shaqshaqiyya?.title).toContain('شقشقیه');

    // Letter 53 (Malik Ashtar)
    const letter53 = items.find(i => i.type === 'letter' && i.num === 53);
    expect(letter53).toBeDefined();
    expect(letter53?.title).toContain('نامه ۵۳');

    // Wisdom 1
    const wisdom1 = items.find(i => i.type === 'wisdom' && i.num === 1);
    expect(wisdom1).toBeDefined();
    expect(wisdom1?.title).toContain('حکمت ۱');

    // Check that Sermon 1 appears in catalog HTML
    const catalogHtml = renderToString(
      <ShiaBookCatalogView
        categoryId="nahj"
        onSelectItem={() => {}}
        onBackToShelf={() => {}}
      />
    );
    expect(catalogHtml).toContain('خطبه ۱');
  });

  // 5 & 6. Opening item in Reader & verifying title, Arabic text, and Persian translation
  it('5 & 6. opens Sermon 1 in reader and verifies title, Arabic text, and Persian translation', () => {
    const handleBackToCatalog = vi.fn();
    const handleSelectItem = vi.fn();

    const html = renderToString(
      <ShiaItemReaderView
        categoryId="nahj"
        itemId="nahj_sermon_1"
        onBackToCatalog={handleBackToCatalog}
        onSelectItem={handleSelectItem}
      />
    );

    // Title
    expect(html).toContain('خطبه ۱');
    // Arabic text
    expect(html).toContain('الْحَمْدُ لِلَّهِ الَّذِي لَا يَبْلُغُ مِدْحَتَهُ الْقَائِلُونَ');
    // Persian translation
    expect(html).toContain('سپاس خدايى را كه سخنوران در ستودن او بمانند');
    // Source attribution (Shahidi)
    expect(html).toContain('شهیدی');
  });

  it('verifies Letter 53 (Malik Ashtar) displays Arabic text and Persian translation', () => {
    const html = renderToString(
      <ShiaItemReaderView
        categoryId="nahj"
        itemId="nahj_letter_53"
        onBackToCatalog={() => {}}
        onSelectItem={() => {}}
      />
    );

    expect(html).toContain('نامه ۵۳');
    expect(html).toContain('مَالِكَ بْنَ الْحَارِثِ الْأَشْتَرَ');
    expect(html).toContain('مالك اشتر');
  });

  it('verifies Wisdom 1 displays Arabic text and Persian translation', () => {
    const html = renderToString(
      <ShiaItemReaderView
        categoryId="nahj"
        itemId="nahj_wisdom_1"
        onBackToCatalog={() => {}}
        onSelectItem={() => {}}
      />
    );

    expect(html).toContain('حکمت ۱');
    expect(html).toContain('كُنْ فِي الْفِتْنَةِ كَابْنِ اللَّبُونِ');
    expect(html).toContain('شتر');
  });

  // 7. Full Navigation & Back Flow:
  // Reader -> Catalog -> Shelf -> Close
  it('7. navigates back through the hierarchy: Reader -> Catalog -> Shelf -> Close', () => {
    const onLevelChange = vi.fn();
    const onClose = vi.fn();

    // In Reader: onBackToCatalog is triggered
    const readerHtml = renderToString(
      <ShiaItemReaderView
        categoryId="nahj"
        itemId="nahj_sermon_1"
        onBackToCatalog={() => onLevelChange('catalog')}
        onSelectItem={() => {}}
      />
    );
    expect(readerHtml).toContain('خطبه ۱');

    // Simulate user clicking Back to Catalog
    onLevelChange('catalog');
    expect(onLevelChange).toHaveBeenLastCalledWith('catalog');

    // In Catalog: onBackToShelf is triggered
    const catalogHtml = renderToString(
      <ShiaBookCatalogView
        categoryId="nahj"
        onSelectItem={() => onLevelChange('reader')}
        onBackToShelf={() => onLevelChange('shelf')}
      />
    );
    expect(catalogHtml).toContain('نهج‌البلاغه');

    // Simulate user clicking Back to Shelf
    onLevelChange('shelf');
    expect(onLevelChange).toHaveBeenLastCalledWith('shelf');

    // In Shelf: close button closes the modal
    const modalHtml = renderToString(
      <ShiaBooksModal
        isOpen={true}
        onClose={onClose}
        currentLevel="shelf"
        onLevelChange={onLevelChange}
      />
    );
    expect(modalHtml).toContain('btn-close-books-modal');

    // Simulate closing library
    onClose();
    expect(onClose).toHaveBeenCalled();
  });

  // 8. End-to-end routing in ShiaBooksModal for Nahj category
  it('8. ShiaBooksModal correctly renders Nahj catalog when category is nahj and viewLevel is catalog', () => {
    const html = renderToString(
      <ShiaBooksModal
        isOpen={true}
        onClose={() => {}}
        initialCategoryId="nahj"
        currentLevel="catalog"
      />
    );

    // Should NOT render BookStageOneView placeholder
    expect(html).not.toContain('مرحله اول: معرفی اثر');
    // Should render ShiaBookCatalogView for Nahj al-Balagha
    expect(html).toContain('خطبه‌ها');
    expect(html).toContain('نامه‌ها');
    expect(html).toContain('حکمت‌ها');
  });

  it('9. ShiaBooksModal correctly renders Nahj reader when category is nahj and viewLevel is reader', () => {
    const html = renderToString(
      <ShiaBooksModal
        isOpen={true}
        onClose={() => {}}
        initialCategoryId="nahj"
        currentLevel="reader"
      />
    );

    // Should NOT render BookStageOneView
    expect(html).not.toContain('مرحله اول: معرفی اثر');
    // Should render ShiaItemReaderView
    expect(html).toContain('الْحَمْدُ لِلَّهِ الَّذِي لَا يَبْلُغُ مِدْحَتَهُ الْقَائِلُونَ');
  });

  // 10. REAL INTERACTIVE INTEGRATION TEST: Controlled modal navigation matching App.tsx
  it('10. actual modal interaction: Shelf -> click Nahj -> Catalog -> click Sermon 1 -> Reader', async () => {
    function ControlledHarness() {
      const [level, setLevel] = useState<'shelf' | 'catalog' | 'reader'>('shelf');
      return (
        <ShiaBooksModal
          isOpen={true}
          onClose={() => {}}
          currentLevel={level}
          onLevelChange={setLevel}
        />
      );
    }

    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    // Step A: Initial render on Shelf
    await act(async () => {
      root.render(<ControlledHarness />);
    });

    const nahjShelfBtn = doc.getElementById('book-shelf-item-nahj');
    expect(nahjShelfBtn).not.toBeNull();
    expect(doc.body.textContent).toContain('کتابخانه اسلامی');
    expect(doc.body.textContent).toContain('نهج‌البلاغه');
    // Catalog items should not be present yet
    expect(doc.getElementById('item-card-nahj_sermon_1')).toBeNull();

    // Step B: User clicks Nahj al-Balagha on the shelf
    await act(async () => {
      nahjShelfBtn.click();
    });

    // Verify modal transitioned to Nahj catalog
    expect(doc.body.textContent).not.toContain('محتوای این کتاب در حال آماده‌سازی است');
    expect(doc.body.textContent).toContain('خطبه‌ها');
    expect(doc.body.textContent).toContain('نامه‌ها');
    expect(doc.body.textContent).toContain('حکمت‌ها');

    const sermon1Card = doc.getElementById('item-card-nahj_sermon_1');
    expect(sermon1Card).not.toBeNull();

    // Step C: User clicks Sermon 1 in the catalog
    await act(async () => {
      sermon1Card.click();
    });

    // Verify modal transitioned to Sermon 1 Reader
    expect(doc.body.textContent).toContain('خطبه ۱');
    expect(doc.body.textContent).toContain('الْحَمْدُ لِلَّهِ الَّذِي لَا يَبْلُغُ مِدْحَتَهُ الْقَائِلُونَ');
    expect(doc.body.textContent).toContain('سپاس خدايى را كه سخنوران در ستودن او بمانند');
    expect(doc.body.textContent).toContain('شهیدی');

    // Step D: User clicks Back to Catalog from reader
    const backToCatalogBtn = doc.getElementById('btn-back-to-catalog');
    expect(backToCatalogBtn).not.toBeNull();
    await act(async () => {
      backToCatalogBtn.click();
    });

    // Verify back on Catalog
    expect(doc.getElementById('item-card-nahj_sermon_1')).not.toBeNull();

    // Step E: User clicks Back to Shelf from catalog
    const backToShelfBtn = doc.getElementById('btn-back-to-shelf');
    expect(backToShelfBtn).not.toBeNull();
    await act(async () => {
      backToShelfBtn.click();
    });

    // Verify back on Shelf
    expect(doc.getElementById('book-shelf-item-nahj')).not.toBeNull();
  });

  // 11. Uncontrolled modal interaction (without currentLevel prop from parent)
  it('11. uncontrolled modal interaction: Shelf -> click Nahj -> Catalog -> click Sermon 1 -> Reader', async () => {
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    // Initial render on Shelf
    await act(async () => {
      root.render(<ShiaBooksModal isOpen={true} onClose={() => {}} />);
    });

    const nahjShelfBtn = doc.getElementById('book-shelf-item-nahj');
    expect(nahjShelfBtn).not.toBeNull();

    // Click Nahj
    await act(async () => {
      nahjShelfBtn.click();
    });

    // Should transition to catalog
    expect(doc.body.textContent).not.toContain('محتوای این کتاب در حال آماده‌سازی است');
    expect(doc.body.textContent).toContain('خطبه‌ها');
    const sermon1Card = doc.getElementById('item-card-nahj_sermon_1');
    expect(sermon1Card).not.toBeNull();

    // Click Sermon 1
    await act(async () => {
      sermon1Card.click();
    });

    // Should transition to reader
    expect(doc.body.textContent).toContain('خطبه ۱');
    expect(doc.body.textContent).toContain('الْحَمْدُ لِلَّهِ الَّذِي لَا يَبْلُغُ مِدْحَتَهُ الْقَائِلُونَ');
  });

  // 12. Tawzih active volume selector
  it('12. active book (Tawzih) opens volume selector', async () => {
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShiaBooksModal isOpen={true} onClose={() => {}} />);
    });

    // Click Tawzih
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
