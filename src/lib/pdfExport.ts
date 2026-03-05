import { jsPDF } from "jspdf";

/**
 * Generates a clean, well-formatted PDF from markdown content.
 * Strips all markdown symbols and renders proper formatting.
 */
export function generateCleanPDF(content: string, filename: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number = 15) => {
    if (y > pageHeight - margin - requiredSpace) {
      doc.addPage();
      y = margin;
    }
  };

  // Helper to render text with inline links (clickable, blue, underlined)
  const renderTextWithLinks = (text: string, x: number, currentY: number, maxW: number, lineHeight: number) => {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    // Clean bold markers first
    let cleanText = text.replace(/\*\*(.+?)\*\*/g, '$1');
    
    // Check if there are any links
    if (!linkPattern.test(cleanText)) {
      // No links, render as plain text
      const wrapped = doc.splitTextToSize(cleanText, maxW);
      wrapped.forEach((wLine: string, idx: number) => {
        if (idx > 0) checkPageBreak();
        doc.text(wLine, x, currentY + idx * lineHeight);
      });
      return wrapped.length * lineHeight;
    }
    
    // Reset pattern after test
    linkPattern.lastIndex = 0;
    
    // Extract links and their positions
    const links: { text: string; url: string; start: number; end: number }[] = [];
    let match;
    while ((match = linkPattern.exec(cleanText)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Replace markdown links with just the link text for display
    const displayText = cleanText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    const wrapped = doc.splitTextToSize(displayText, maxW);
    
    let charIndex = 0;
    wrapped.forEach((wLine: string, idx: number) => {
      if (idx > 0) checkPageBreak();
      const lineY = currentY + idx * lineHeight;
      
      // Check if this line contains any link text
      let lineStartChar = charIndex;
      let lineEndChar = charIndex + wLine.length;
      let currentX = x;
      let remainingLine = wLine;
      
      // Find links that appear in this line
      let linkDisplayOffset = 0;
      for (const link of links) {
        // Calculate where link text appears in the display text
        const linkDisplayStart = cleanText.substring(0, link.start).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').length;
        const linkDisplayEnd = linkDisplayStart + link.text.length;
        
        if (linkDisplayStart < lineEndChar && linkDisplayEnd > lineStartChar) {
          // This link appears in this line
          const linkStartInLine = Math.max(0, linkDisplayStart - lineStartChar);
          const linkEndInLine = Math.min(wLine.length, linkDisplayEnd - lineStartChar);
          
          // Text before link
          const beforeLink = wLine.substring(0, linkStartInLine);
          if (beforeLink) {
            doc.setTextColor(0, 0, 0);
            doc.text(beforeLink, currentX, lineY);
            currentX += doc.getTextWidth(beforeLink);
          }
          
          // Link text (blue, underlined, clickable)
          const linkText = wLine.substring(linkStartInLine, linkEndInLine);
          if (linkText) {
            doc.setTextColor(0, 102, 204); // Blue color
            doc.textWithLink(linkText, currentX, lineY, { url: link.url });
            // Add underline
            const linkWidth = doc.getTextWidth(linkText);
            doc.setDrawColor(0, 102, 204);
            doc.line(currentX, lineY + 0.5, currentX + linkWidth, lineY + 0.5);
            currentX += linkWidth;
          }
          
          // Update remaining line
          remainingLine = wLine.substring(linkEndInLine);
        }
      }
      
      // Render any remaining text after links
      if (remainingLine && currentX > x) {
        doc.setTextColor(0, 0, 0);
        doc.text(remainingLine, currentX, lineY);
      } else if (currentX === x) {
        // No links were found in this line, render normally
        doc.setTextColor(0, 0, 0);
        doc.text(wLine, x, lineY);
      }
      
      charIndex += wLine.length + 1; // +1 for newline
    });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    return wrapped.length * lineHeight;
  };

  // Parse and render markdown
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // H1 - Main title (large, bold)
    if (line.startsWith('# ')) {
      checkPageBreak(15);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const text = line.replace(/^# /, '').replace(/\*\*(.+?)\*\*/g, '$1');
      const wrapped = doc.splitTextToSize(text, maxWidth);
      wrapped.forEach((wLine: string) => {
        checkPageBreak();
        doc.text(wLine, margin, y);
        y += 8;
      });
      y += 4;
    }
    // H2 - Section header (medium, bold)
    else if (line.startsWith('## ')) {
      y += 4; // Space before heading
      checkPageBreak(12);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const text = line.replace(/^## /, '').replace(/\*\*(.+?)\*\*/g, '$1');
      const wrapped = doc.splitTextToSize(text, maxWidth);
      wrapped.forEach((wLine: string) => {
        checkPageBreak();
        doc.text(wLine, margin, y);
        y += 6;
      });
      y += 3;
    }
    // H3 - Subsection header (smaller, bold)
    else if (line.startsWith('### ')) {
      y += 3;
      checkPageBreak(10);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const text = line.replace(/^### /, '').replace(/\*\*(.+?)\*\*/g, '$1');
      const wrapped = doc.splitTextToSize(text, maxWidth);
      wrapped.forEach((wLine: string) => {
        checkPageBreak();
        doc.text(wLine, margin, y);
        y += 5;
      });
      y += 2;
    }
    // Bullet points
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      checkPageBreak();
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const text = line.replace(/^[-*] /, '');
      
      // Draw bullet
      doc.text('•', margin, y);
      
      // Render text with clickable links
      const height = renderTextWithLinks(text, margin + 8, y, maxWidth - 12, 4.5);
      y += height + 1;
    }
    // Numbered lists
    else if (line.match(/^\d+\. /)) {
      checkPageBreak();
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const match = line.match(/^(\d+)\. (.+)$/);
      if (match) {
        // Draw number
        doc.text(`${match[1]}.`, margin, y);
        
        // Render text with clickable links
        const height = renderTextWithLinks(match[2], margin + 8, y, maxWidth - 12, 4.5);
        y += height + 1;
      }
    }
    // Empty line
    else if (line.trim() === '') {
      y += 3;
    }
    // Regular paragraph
    else {
      checkPageBreak();
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Render text with clickable links
      const height = renderTextWithLinks(line, margin, y, maxWidth, 4.5);
      y += height + 1;
    }
  }

  // Save with clean filename
  const cleanFilename = filename.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  doc.save(`${cleanFilename}.pdf`);
}

/**
 * Extracts a title from markdown content for use in filenames
 */
export function extractTitleFromContent(content: string, fallback: string = "Document"): string {
  if (!content) return fallback;
  
  // Look for markdown heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  
  // Look for a line ending with common job title patterns
  const titleMatch = content.match(/^(.+(?:Manager|Engineer|Developer|Designer|Lead|Director|Specialist|Analyst|Coordinator|Executive|Associate|Consultant|Architect|Administrator|Strategist|Marketer|Writer|Editor))/im);
  if (titleMatch) return titleMatch[1].trim();
  
  // Use first non-empty line
  const firstLine = content.split('\n').find(line => line.trim());
  if (firstLine) return firstLine.replace(/^#+\s*/, '').trim().slice(0, 60);
  
  return fallback;
}
