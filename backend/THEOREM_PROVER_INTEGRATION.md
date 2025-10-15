# Theorem Prover Integration

The backend now integrates with the `process_user_response` function from `interface.py` to provide advanced clinical reasoning using formal logic and theorem proving.

## Features

### Enhanced Chat API

The `/api/chat` endpoint now returns enhanced responses with theorem prover information:

```json
{
  "message": "The patient's name is Joe Bloggs.",
  "timestamp": "2025-10-13T19:30:00.000Z",
  "corrupted_response": "The patient's name is Jane Bloggs.", // If corruption was applied
  "extracted_logical_stmt": "(= name \"Joe Bloggs\")",
  "validity": "true",
  "processing_durations": {
    "LLM": 0.29,
    "extraction": 1.45,
    "theorem prover": 0.12
  }
}
```

### Graceful Fallback

The system provides multiple levels of fallback:

1. **Full Theorem Prover Mode**: Uses `process_user_response` with AI agents and formal logic
2. **Fallback Mode**: Uses simple chat service when theorem prover fails (AWS issues, etc.)
3. **Simple Mode**: Uses basic chat service when interface is not available

## Configuration

### AWS Credentials

The theorem prover uses AWS Bedrock for AI processing. Configure your AWS credentials:

```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1

# Option 3: AWS credentials file
# ~/.aws/credentials
[default]
aws_access_key_id = your_access_key
aws_secret_access_key = your_secret_key
region = us-east-1
```

### Dependencies

Required packages (already in requirements.txt):
- `cvc5==1.3.1` - Theorem prover
- `strands-agents==1.9.1` - AI agent framework

## Usage Examples

### Basic Chat
```bash
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the patient name?"}'
```

### Expected Response Modes

**With AWS Credentials (Full Mode):**
```json
{
  "message": "The patient's name is Joe Bloggs.",
  "extracted_logical_stmt": "(= name \"Joe Bloggs\")",
  "validity": "true"
}
```

**Without AWS Credentials (Fallback Mode):**
```json
{
  "message": "[Fallback Mode] Based on the patient information, the name is Joe Bloggs."
}
```

**Interface Not Available (Simple Mode):**
```json
{
  "message": "[Simple Mode] I'd be happy to help with that question!"
}
```

## Theorem Prover Features

### Logical Statement Extraction
- Converts natural language responses to first-order logic
- Example: "The patient is 75 years old" → `(= age 75.83)`

### Statement Validation
- Uses CVC5 theorem prover to validate logical statements
- Returns: `true`, `false`, or `unknown`

### Response Corruption (Testing)
- Randomly corrupts responses to test logical consistency
- Helps identify when AI responses contradict known facts

### Performance Metrics
- Tracks processing time for different components:
  - LLM response generation
  - Logical statement extraction  
  - Theorem prover validation

## Patient Data

The system currently works with patient "Joe Bloggs" with the following facts:
- Name: Joe Bloggs
- Birth date: 1950-01-01
- Age: 75.83 years
- Heart rate measurements: 55.0 bpm (2005-01-31), 60.0 bpm (2006-01-31)
- Weight measurements: 150.0 lbs (2005-01-31), 155.0 lbs (2006-01-31)
- Diagnosis: E11 (diabetes) with changing status over time

## Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   ```
   The security token included in the request is invalid
   ```
   - Configure AWS credentials as described above
   - System will automatically fall back to simple mode

2. **Import Errors**
   ```
   Could not import interface module
   ```
   - Ensure `cvc5` and `strands-agents` are installed
   - Check that `interface.py` exists in the root directory

3. **Theorem Prover Timeout**
   - The system will fall back to simple responses
   - Check AWS Bedrock service availability

### Logs

Monitor the backend logs for detailed information:
```bash
# Start server with detailed logging
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug
```

Look for these log messages:
- `✅ Theorem prover response:` - Full mode working
- `AWS credentials not configured` - Fallback mode
- `Falling back to simple chat service` - Error handling

## Development

### Testing the Integration

```python
# Test theorem prover directly
from interface import process_user_response

response = process_user_response("What is the patient's age?", do_corrupt=False)
print(f"Response: {response.assistant_response}")
print(f"Logic: {response.extracted_logical_stmt}")
print(f"Valid: {response.valid}")
```

### Adding New Patient Data

Modify the facts in `core.py` or `interface.py` to work with different patient scenarios.