# New endpoint for SmartFormParserV2
# This will be inserted into app.py right after the existing /api/parse-pdf endpoint

@app.route('/api/parse-pdf-v2', methods=['POST'])
def parse_pdf_v2():
    """
    Parse PDF form using OpenAI API and return V2 form structure
    Frontend sends PDF as multipart/form-data
    Returns: { title, sections: [ { id, title, instructions, fields: [] } ] }
    """
    import requests
    
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.pdf'):
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        # Read file and convert to base64
        file_content = file.read()
        base64_pdf = base64.b64encode(file_content).decode('utf-8')
        
        # Get OpenAI API key from environment
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        if not openai_api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        # Call OpenAI API
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {openai_api_key}'
            },
            json={
                'model': 'gpt-4o',
                'max_tokens': 16000,
                'messages': [{
                    'role': 'user',
                    'content': [
                        {
                            'type': 'image_url',
                            'image_url': {
                                'url': f'data:application/pdf;base64,{base64_pdf}'
                            }
                        },
                        {
                            'type': 'text',
                            'text': '''Parse this licensing board PDF form into a structured JSON schema.

STRICT RULES:
1. Return ONLY valid JSON, no markdown, no extra text
2. Use this exact structure:
{
  "title": "Form Title",
  "sections": [
    {
      "id": "sec_1",
      "title": "Section Title",
      "instructions": "Any instructional text for this section",
      "fields": [
        {
          "id": "f_1",
          "label": "Field Label",
          "type": "text|email|tel|date|number|textarea|radio|checkbox|file",
          "required": true|false,
          "placeholder": "optional placeholder",
          "options": ["Option 1", "Option 2"],
          "position": 1,
          "conditionalOn": null,
          "conditionalValue": null,
          "helpText": "optional help text"
        }
      ]
    }
  ]
}

3. Section IDs: "sec_1", "sec_2", etc.
4. Field IDs: "f_1", "f_2", etc. (globally unique across all sections)
5. Field types: ONLY use: text, email, tel, date, number, textarea, radio, checkbox, file
6. Radio fields MUST have options array
7. Checkbox fields are boolean (no options)
8. Instructions go in section.instructions, NOT as a field
9. Multi-part questions (e.g., first/middle/last name) = separate fields
10. Preserve exact order of fields as they appear in PDF
11. If a field shows/hides based on another field, set conditionalOn to that field's id and conditionalValue to the trigger value

Return ONLY the JSON object.'''
                        }
                    ]
                }]
            },
            timeout=60
        )
        
        if not response.ok:
            error_data = response.json()
            return jsonify({
                'error': f"OpenAI API error: {error_data.get('error', {}).get('message', response.text)}"
            }), response.status_code
        
        data = response.json()
        
        # Check for truncation
        if data['choices'][0]['finish_reason'] == 'length':
            return jsonify({
                'error': 'Response was truncated - form too complex. Try a simpler form or split into sections.'
            }), 400
        
        # Extract text content
        text_content = data['choices'][0]['message']['content']
        if not text_content:
            return jsonify({'error': 'No text content in AI response'}), 500
        
        # Clean and parse JSON
        # Remove markdown code blocks if present
        cleaned = text_content.strip()
        if cleaned.startswith('```'):
            # Remove ```json and ``` markers
            lines = cleaned.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            cleaned = '\n'.join(lines)
        
        # Parse JSON
        try:
            parsed_form = json.loads(cleaned)
        except json.JSONDecodeError as e:
            return jsonify({
                'error': f'Failed to parse AI response as JSON: {str(e)}',
                'raw_response': text_content[:500]
            }), 500
        
        # Basic validation
        if 'title' not in parsed_form or 'sections' not in parsed_form:
            return jsonify({
                'error': 'Invalid form structure: missing title or sections',
                'parsed': parsed_form
            }), 400
        
        # Return success
        return jsonify({
            'success': True,
            'form_structure': parsed_form,
            'metadata': {
                'filename': secure_filename(file.filename),
                'total_sections': len(parsed_form.get('sections', [])),
                'total_fields': sum(len(s.get('fields', [])) for s in parsed_form.get('sections', []))
            }
        })
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'OpenAI API request timed out'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'OpenAI API request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
