# Facts/Axioms Toggle Feature

The right-hand pane now supports switching between **Facts** and **Axioms** views.

## Features

### Toggle Button
- Located in the header of the Theory Section
- Switches between "Show Axioms" and "Show Facts"
- Disabled during loading states
- Accessible with keyboard navigation

### Facts View
- Shows natural language facts about the patient
- Example: "The patient's name is Joe Bloggs"
- Styled as regular text items

### Axioms View  
- Shows formal logic axioms from the theorem prover
- Example: `(= name "Joe Bloggs")`
- Styled with monospace font and code-like appearance
- Each axiom has a blue left border for visual distinction

## API Endpoints

### GET /api/facts
Returns natural language facts:
```json
{
  "facts": [
    "The patient's name is Joe Bloggs",
    "The patient's birth date is 1950-01-01",
    "The patient's age is 75.83 years"
  ],
  "timestamp": "2025-10-13T19:30:00.000Z"
}
```

### GET /api/axioms
Returns formal logic axioms:
```json
{
  "axioms": [
    "(= name \"Joe Bloggs\")",
    "(= birth-date (- 7304))",
    "(= age (/ 7583013698630137 100000000000000))"
  ],
  "timestamp": "2025-10-13T19:30:00.000Z"
}
```

## Usage

1. **Start the servers:**
   ```bash
   # Backend
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   
   # Frontend
   cd react-chatbot
   npm start
   ```

2. **View the toggle:**
   - Open http://localhost:3000
   - Look at the right-hand pane header
   - Click "Show Axioms" to switch to axioms view
   - Click "Show Facts" to switch back to facts view

## Styling

### Facts
- Regular text appearance
- Standard line spacing
- Easy to read natural language

### Axioms
- Monospace font (Monaco, Menlo, Ubuntu Mono)
- Light gray background
- Blue left border
- Slightly smaller font size
- Code-like appearance
- **Preserves whitespace and indentation** (`white-space: pre-wrap`)
- Proper formatting for nested logical expressions

## Accessibility

- Toggle button has proper ARIA labels
- Screen reader instructions updated to mention toggle functionality
- Keyboard accessible
- High contrast mode support
- Focus indicators

## Fallback Behavior

When the theorem prover interface is not available:
- **Facts**: Shows sample patient data
- **Axioms**: Shows example logical axioms
- Toggle functionality remains available

## Technical Implementation

### Backend
- Added `get_axioms_as_str()` function to `interface.py`
- New `/api/axioms` endpoint in FastAPI
- Graceful fallback when theorem prover unavailable

### Frontend
- Enhanced `FactsService` with `getAxioms()` method
- Updated `TheorySection` component with toggle state
- New CSS classes for axiom styling
- Responsive design considerations

### Error Handling
- Network errors handled gracefully
- Loading states during data fetch
- Fallback content when services unavailable