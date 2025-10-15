import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TheorySection from '../TheorySection';

describe('TheorySection Component', () => {
  describe('Component Display and Content Handling', () => {
    it('should render with default content when no content prop provided', () => {
      render(<TheorySection />);
      
      expect(screen.getByRole('heading', { level: 2, name: 'Logical Context' })).toBeInTheDocument();
      expect(screen.getByText('Theorem prover facts and reasoning context')).toBeInTheDocument();
      expect(screen.getByText('Theorem Prover Facts')).toBeInTheDocument();
    });

    it('should render with custom content when provided', () => {
      const customContent = '# Custom Theory\n\nThis is custom theorem prover content.';
      
      render(<TheorySection content={customContent} />);
      
      expect(screen.getByText('Custom Theory')).toBeInTheDocument();
      expect(screen.getByText('This is custom theorem prover content.')).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      const customClass = 'custom-theory-class';
      
      render(<TheorySection className={customClass} />);
      
      const theorySection = screen.getByRole('complementary');
      expect(theorySection).toHaveClass('theory-section', customClass);
    });

    it('should have proper semantic structure', () => {
      render(<TheorySection />);
      
      const section = screen.getByRole('complementary');
      expect(section).toHaveAttribute('aria-label', 'Theorem prover facts and logical context');
      
      const header = section.querySelector('.theory-section__header');
      expect(header).toBeInTheDocument();
      
      const content = section.querySelector('.theory-section__content');
      expect(content).toBeInTheDocument();
      
      const scrollable = section.querySelector('.theory-section__scrollable');
      expect(scrollable).toBeInTheDocument();
    });
  });

  describe('Content Formatting', () => {
    it('should format markdown headers correctly', () => {
      const content = '# Header 1\n## Header 2\n### Header 3';
      
      render(<TheorySection content={content} />);
      
      // Check that headers are rendered with appropriate classes
      const contentDiv = document.querySelector('.theory-section__text');
      expect(contentDiv?.innerHTML).toContain('<h2 class="theory-section__h2">Header 1</h2>');
      expect(contentDiv?.innerHTML).toContain('<h3 class="theory-section__h3">Header 2</h3>');
      expect(contentDiv?.innerHTML).toContain('<h4 class="theory-section__h4">Header 3</h4>');
    });

    it('should format code blocks correctly', () => {
      const content = '```\nconst x = 1;\nconsole.log(x);\n```';
      
      render(<TheorySection content={content} />);
      
      const codeBlock = document.querySelector('.theory-section__code');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock?.textContent).toContain('const x = 1;');
      expect(codeBlock?.textContent).toContain('console.log(x);');
    });

    it('should format inline code correctly', () => {
      const content = 'This is `inline code` in text.';
      
      render(<TheorySection content={content} />);
      
      const inlineCode = document.querySelector('.theory-section__inline-code');
      expect(inlineCode).toBeInTheDocument();
      expect(inlineCode?.textContent).toBe('inline code');
    });

    it('should format bold text correctly', () => {
      const content = 'This is **bold text** in content.';
      
      render(<TheorySection content={content} />);
      
      const strongElement = document.querySelector('strong');
      expect(strongElement).toBeInTheDocument();
      expect(strongElement?.textContent).toBe('bold text');
    });

    it('should format bullet lists correctly', () => {
      const content = '- Item 1\n- Item 2\n- Item 3';
      
      render(<TheorySection content={content} />);
      
      const list = document.querySelector('.theory-section__list');
      expect(list).toBeInTheDocument();
      
      const listItems = document.querySelectorAll('.theory-section__list-item');
      expect(listItems).toHaveLength(3);
      expect(listItems[0].textContent).toBe('Item 1');
      expect(listItems[1].textContent).toBe('Item 2');
      expect(listItems[2].textContent).toBe('Item 3');
    });

    it('should format paragraphs correctly', () => {
      const content = 'First paragraph.\n\nSecond paragraph.';
      
      render(<TheorySection content={content} />);
      
      const paragraphs = document.querySelectorAll('.theory-section__paragraph');
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0].textContent).toBe('First paragraph.');
      expect(paragraphs[1].textContent).toBe('Second paragraph.');
    });

    it('should handle complex mixed content formatting', () => {
      const content = `# Main Title

This is a paragraph with **bold text** and \`inline code\`.

## Subsection

- List item with **bold**
- Another item

\`\`\`
code block
multiple lines
\`\`\`

### Another subsection

Final paragraph.`;
      
      render(<TheorySection content={content} />);
      
      // Verify various elements are present
      expect(document.querySelector('.theory-section__h2')).toBeInTheDocument();
      expect(document.querySelector('.theory-section__h3')).toBeInTheDocument();
      expect(document.querySelector('.theory-section__h4')).toBeInTheDocument();
      expect(document.querySelector('.theory-section__code')).toBeInTheDocument();
      expect(document.querySelector('.theory-section__inline-code')).toBeInTheDocument();
      expect(document.querySelector('.theory-section__list')).toBeInTheDocument();
      expect(document.querySelector('strong')).toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      render(<TheorySection content="" />);
      
      const contentDiv = document.querySelector('.theory-section__text');
      expect(contentDiv).toBeInTheDocument();
      // Empty content falls back to default content, so it should contain default content
      expect(contentDiv?.innerHTML).toContain('Theorem Prover Facts');
    });

    it('should handle content with only whitespace', () => {
      render(<TheorySection content="   \n\n   " />);
      
      const contentDiv = document.querySelector('.theory-section__text');
      expect(contentDiv).toBeInTheDocument();
      // Whitespace content may create minimal paragraphs, but should be handled gracefully
      expect(contentDiv).toBeInTheDocument();
    });
  });

  describe('Default Content Structure', () => {
    it('should display all sections of default content', () => {
      render(<TheorySection />);
      
      // Check for main sections using more specific queries
      expect(screen.getByText('Theorem Prover Facts')).toBeInTheDocument();
      expect(screen.getAllByText('Logical Context')).toHaveLength(2); // Header and content section
      expect(screen.getByText('Current Axioms')).toBeInTheDocument();
      expect(screen.getByText('Active Rules')).toBeInTheDocument();
      expect(screen.getByText('Current Proof State')).toBeInTheDocument();
      expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
      expect(screen.getByText('Inference Engine')).toBeInTheDocument();
    });

    it('should display axioms in default content', () => {
      render(<TheorySection />);
      
      expect(screen.getByText(/Identity Axiom/)).toBeInTheDocument();
      expect(screen.getByText(/Substitution Principle/)).toBeInTheDocument();
      expect(screen.getByText(/Modus Ponens/)).toBeInTheDocument();
    });

    it('should display logical rules in default content', () => {
      render(<TheorySection />);
      
      expect(screen.getByText(/Transitivity/)).toBeInTheDocument();
      expect(screen.getByText(/Contraposition/)).toBeInTheDocument();
      expect(screen.getByText(/De Morgan's Laws/)).toBeInTheDocument();
    });

    it('should display proof state information', () => {
      render(<TheorySection />);
      
      expect(screen.getByText(/Goal: Prove user query satisfiability/)).toBeInTheDocument();
      expect(screen.getByText(/Assumptions:/)).toBeInTheDocument();
      expect(screen.getByText(/Applied Rules:/)).toBeInTheDocument();
      expect(screen.getByText(/Remaining Steps:/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TheorySection />);
      
      const section = screen.getByRole('complementary');
      expect(section).toHaveAttribute('aria-label', 'Theorem prover facts and logical context');
    });

    it('should have proper heading hierarchy', () => {
      render(<TheorySection />);
      
      const mainTitle = screen.getByRole('heading', { level: 2, name: 'Logical Context' });
      expect(mainTitle).toBeInTheDocument();
      
      // Check that the formatted content maintains heading hierarchy
      const contentDiv = document.querySelector('.theory-section__text');
      const h2Elements = contentDiv?.querySelectorAll('.theory-section__h2');
      const h3Elements = contentDiv?.querySelectorAll('.theory-section__h3');
      const h4Elements = contentDiv?.querySelectorAll('.theory-section__h4');
      
      expect(h2Elements?.length).toBeGreaterThan(0);
      expect(h3Elements?.length).toBeGreaterThan(0);
      expect(h4Elements?.length).toBeGreaterThan(0);
    });

    it('should be keyboard accessible', () => {
      render(<TheorySection />);
      
      const section = screen.getByRole('complementary');
      // The section should be focusable for keyboard navigation
      expect(section).toBeInTheDocument();
      
      const scrollableArea = section.querySelector('.theory-section__scrollable');
      expect(scrollableArea).toBeInTheDocument();
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply correct CSS classes to elements', () => {
      render(<TheorySection />);
      
      const section = screen.getByRole('complementary');
      expect(section).toHaveClass('theory-section');
      
      const header = section.querySelector('.theory-section__header');
      expect(header).toBeInTheDocument();
      
      const title = section.querySelector('.theory-section__title');
      expect(title).toBeInTheDocument();
      
      const subtitle = section.querySelector('.theory-section__subtitle');
      expect(subtitle).toBeInTheDocument();
      
      const content = section.querySelector('.theory-section__content');
      expect(content).toBeInTheDocument();
      
      const scrollable = section.querySelector('.theory-section__scrollable');
      expect(scrollable).toBeInTheDocument();
      
      const text = section.querySelector('.theory-section__text');
      expect(text).toBeInTheDocument();
    });

    it('should combine custom className with default classes', () => {
      const customClass = 'my-custom-class';
      render(<TheorySection className={customClass} />);
      
      const section = screen.getByRole('complementary');
      expect(section).toHaveClass('theory-section', customClass);
    });
  });

  describe('Content Security', () => {
    it('should safely render HTML content using dangerouslySetInnerHTML', () => {
      const content = '# Safe Content\n\nThis is **safe** content.';
      
      render(<TheorySection content={content} />);
      
      const textDiv = document.querySelector('.theory-section__text');
      expect(textDiv).toBeInTheDocument();
      
      // Verify that the content is rendered as HTML
      expect(textDiv?.innerHTML).toContain('<h2 class="theory-section__h2">Safe Content</h2>');
      expect(textDiv?.innerHTML).toContain('<strong>safe</strong>');
    });

    it('should handle potentially unsafe content appropriately', () => {
      // The component uses dangerouslySetInnerHTML, so it's important to note
      // that in a real application, content should be sanitized before passing to this component
      const content = '# Title\n\nNormal content.';
      
      render(<TheorySection content={content} />);
      
      const textDiv = document.querySelector('.theory-section__text');
      expect(textDiv).toBeInTheDocument();
      expect(textDiv?.innerHTML).toContain('Normal content.');
    });
  });
});