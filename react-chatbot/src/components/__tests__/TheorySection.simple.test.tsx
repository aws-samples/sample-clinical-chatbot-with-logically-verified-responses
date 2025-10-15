import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TheorySection } from '../TheorySection';
import * as FactsService from '../../services/FactsService';

// Mock the FactsService
vi.mock('../../services/FactsService', () => ({
  factsService: {
    getFacts: vi.fn(),
    cancelRequest: vi.fn(),
  },
}));

describe('TheorySection - Simplified', () => {
  const mockFactsService = FactsService.factsService as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with "Logical context" heading', () => {
    mockFactsService.getFacts.mockResolvedValue([]);
    
    render(<TheorySection />);
    
    expect(screen.getByText('Logical context')).toBeInTheDocument();
  });

  it('should display facts from the backend', async () => {
    const mockFacts = [
      'Patient name: John Doe',
      'Patient age: 45 years old',
      'Heart rate: 72 bpm'
    ];
    
    mockFactsService.getFacts.mockResolvedValue(mockFacts);
    
    render(<TheorySection />);
    
    // Wait for facts to load
    await screen.findByText('Patient name: John Doe');
    
    expect(screen.getByText('Patient name: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Patient age: 45 years old')).toBeInTheDocument();
    expect(screen.getByText('Heart rate: 72 bpm')).toBeInTheDocument();
  });

  it('should display custom content when provided', () => {
    const customContent = 'Custom fact 1\nCustom fact 2\nCustom fact 3';
    
    render(<TheorySection content={customContent} />);
    
    expect(screen.getByText('Custom fact 1')).toBeInTheDocument();
    expect(screen.getByText('Custom fact 2')).toBeInTheDocument();
    expect(screen.getByText('Custom fact 3')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    mockFactsService.getFacts.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<TheorySection />);
    
    expect(screen.getByText('Loading facts...')).toBeInTheDocument();
  });

  it('should show "No facts available" when no facts are returned', async () => {
    mockFactsService.getFacts.mockResolvedValue([]);
    
    render(<TheorySection />);
    
    await screen.findByText('No facts available.');
    
    expect(screen.getByText('No facts available.')).toBeInTheDocument();
  });
});