import React, { useRef, useEffect } from "react";

type ContentEditableProps = {
  className?: string;
  content: string;
  updateContent: (newContent: string) => void;
};

const ContentEditable: React.FC<ContentEditableProps> = ({
  className = "",
  content,
  updateContent,
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const lastCursorPosition = useRef<number | null>(null);
  const isComposing = useRef<boolean>(false); // Track composition state

  // Save cursor position before update
  const saveCursorPosition = (): void => {
    const selection = window.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      contentEditableRef.current &&
      contentEditableRef.current.contains(selection.anchorNode)
    ) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(contentEditableRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      lastCursorPosition.current = preCaretRange.toString().length;
    }
  };

  // Helper to get all text nodes in an element
  const getTextNodesIn = (node: Node): Text[] => {
    let textNodes: Text[] = [];
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text);
    } else {
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        textNodes.push(...getTextNodesIn(children[i]));
      }
    }
    return textNodes;
  };

  // Restore cursor position after update
  const restoreCursorPosition = (pos: number | null): void => {
    if (pos === null || !contentEditableRef.current) return;

    const textNodes = getTextNodesIn(contentEditableRef.current);
    let charCount = 0;
    let foundNode: Text | null = null;
    let foundOffset = 0;

    for (const node of textNodes) {
      const nodeLength = node.nodeValue?.length || 0;
      if (charCount + nodeLength >= pos) {
        foundNode = node;
        foundOffset = pos - charCount;
        break;
      }
      charCount += nodeLength;
    }

    if (!foundNode) {
      if (textNodes.length > 0) {
        foundNode = textNodes[textNodes.length - 1];
        foundOffset = foundNode.nodeValue?.length || 0;
      } else {
        // If no text nodes, create one
        foundNode = document.createTextNode("");
        contentEditableRef.current.appendChild(foundNode);
        foundOffset = 0;
      }
    }

    const selection = window.getSelection();
    if (selection && foundNode) {
      const range = document.createRange();
      range.setStart(foundNode, foundOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>): void => {
    if (!isComposing.current) {
      saveCursorPosition();
      updateContent(e.currentTarget.textContent || "");
    }
  };

  const handleCompositionStart = (): void => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (): void => {
    isComposing.current = false;
    saveCursorPosition();
    updateContent(contentEditableRef.current?.textContent || "");
  };

  useEffect(() => {
    if (lastCursorPosition.current !== null) {
      restoreCursorPosition(lastCursorPosition.current);
    }
  }, [content]);

  return (
    <div
      ref={contentEditableRef}
      contentEditable
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      dangerouslySetInnerHTML={{ __html: content }}
      className={className}
    />
  );
};

export default ContentEditable;
