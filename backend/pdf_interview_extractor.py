"""
AI-powered PDF to Interview Converter
Extracts form fields from PDFs and converts them to Docassemble-style interview structure
"""

import os
import json
import re
from openai import OpenAI

class PDFInterviewExtractor:
    """Extract interview structure from PDF documents using AI"""
    
    def __init__(self, db=None, FieldLibrary=None):
        # OpenAI client is pre-configured via environment variables
        self.client = OpenAI()
        self.model = "gpt-4.1-mini"
        self.db = db
        self.FieldLibrary = FieldLibrary
        
        # Import FieldMatcher for field matching
        if FieldLibrary:
            from field_matcher import FieldMatcher
            self.field_matcher = FieldMatcher
        else:
            self.field_matcher = None
    
    def extract_interview_from_pdf(self, pdf_path):
        """
        Extract interview structure from a PDF file
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            dict with interview structure:
                - interview_name: str
                - description: str
                - sections: list of sections with questions
                - total_questions: int
                - estimated_time_minutes: int
        """
        # Read PDF content
        pdf_text = self._extract_text_from_pdf(pdf_path)
        
        # Use OpenAI to analyze and create interview structure
        interview_structure = self._analyze_with_ai(pdf_text)
        
        return interview_structure
    
    def _extract_text_from_pdf(self, pdf_path):
        """Extract text content from PDF using pdftotext, fallback to OCR for image-based PDFs"""
        import subprocess
        import os
        
        try:
            # First try standard text extraction
            result = subprocess.run(
                ['pdftotext', pdf_path, '-'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and len(result.stdout.strip()) > 100:
                # If we got meaningful text, return it
                return result.stdout
            
            # If text extraction failed or returned too little, try OCR
            print("Text extraction returned minimal content, attempting OCR...")
            return self._extract_text_with_ocr(pdf_path)
                
        except subprocess.TimeoutExpired:
            raise Exception("PDF text extraction timed out")
        except FileNotFoundError:
            raise Exception("pdftotext not found. Please install poppler-utils.")
    
    def _extract_text_with_ocr(self, pdf_path):
        """Extract text from image-based PDFs using Tesseract OCR"""
        import subprocess
        import tempfile
        import os
        
        try:
            # Convert PDF to images
            with tempfile.TemporaryDirectory() as tmpdir:
                # Convert PDF pages to PNG images
                subprocess.run(
                    ['pdftoppm', pdf_path, os.path.join(tmpdir, 'page'), '-png'],
                    capture_output=True,
                    timeout=60
                )
                
                # Get all generated images
                images = sorted([f for f in os.listdir(tmpdir) if f.endswith('.png')])
                
                if not images:
                    raise Exception("No images generated from PDF")
                
                # OCR each image and combine text
                all_text = []
                for img in images:
                    img_path = os.path.join(tmpdir, img)
                    result = subprocess.run(
                        ['tesseract', img_path, 'stdout'],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    if result.returncode == 0:
                        all_text.append(result.stdout)
                
                combined_text = '\n'.join(all_text)
                if not combined_text.strip():
                    raise Exception("OCR extraction returned no text")
                
                return combined_text
                
        except subprocess.TimeoutExpired:
            raise Exception("OCR text extraction timed out")
        except FileNotFoundError as e:
            raise Exception(f"OCR tool not found: {str(e)}. Please install tesseract-ocr and poppler-utils.")
    
    def _analyze_with_ai(self, pdf_text):
        """Use OpenAI to analyze PDF and create interview structure"""
        
        system_prompt = """You are an expert at converting government and regulatory forms into user-friendly interview-style questionnaires.

CRITICAL: Extract ALL content from the form - fields, questions, AND instruction blocks. Do not skip or omit any information.

Your task:
1. Identify ALL fields/questions in the form
2. Extract ALL instruction blocks (NOTE sections, header instructions, explanatory paragraphs)
3. Group related fields into logical questions (1-5 fields per question)
4. Organize questions into sections by topic/category
5. Create 5-20 sections (not just 1-2)
6. Use actual field names and labels from the form
7. Write natural, conversational question text
8. Estimate time: 1-2 minutes per question

IMPORTANT: Instruction blocks include:
- Header instructions ("All questions must be answered...")
- NOTE or NOTICE sections
- Explanatory paragraphs
- Legal disclaimers
- Document requirements
- Any text that provides guidance but is not a question

Return ONLY valid JSON in this exact format:
{
  "interview_name": "Application Name",
  "description": "What this application collects",
  "estimated_time_minutes": 20,
  "sections": [
    {
      "title": "Section Title",
      "description": "What this section covers",
      "elements": [
        {
          "element_type": "instruction_block",
          "title": "Important Note",
          "content": "All questions on this application must be answered fully and completely as required.",
          "style": "info"
        },
        {
          "element_type": "question",
          "question_text": "What is your full name?",
          "question_type": "fields",
          "fields": [
            {"name": "first_name", "label": "First Name", "field_type": "text", "required": true},
            {"name": "last_name", "label": "Last Name", "field_type": "text", "required": true}
          ]
        }
      ]
    }
  ]
}

Element types:
- "instruction_block": For NOTE sections, instructions, explanatory text
- "question": For actual questions with fields to collect

Instruction block styles:
- "info": General instructions (blue)
- "warning": Important notes, requirements (orange)
- "alert": Legal notices, mandatory disclosures (red)

Question types: "fields" (multiple inputs), "yesno" (yes/no), "choice" (select one), "signature"
Field types: text, email, tel, number, date, select, checkbox, textarea"""

        user_prompt = f"""Extract and convert this form to an interview structure. Include ALL fields, questions, AND instruction blocks.

Form content:
{pdf_text}

IMPORTANT:
- Extract EVERY field mentioned in the form
- Extract ALL instruction blocks (NOTE sections, header instructions, explanatory text)
- Place instruction blocks BEFORE related questions in the elements array
- Create 5-20 sections (organize by topic)
- Group related fields into questions
- Use meaningful field names (snake_case)
- Write conversational question text
- Assign appropriate style to instruction blocks (info/warning/alert)
- Return ONLY valid JSON"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,  # Lower temp for more consistent structure
                response_format={"type": "json_object"}
            )
            
            # Parse the JSON response
            result = json.loads(response.choices[0].message.content)
            
            # Post-process to match fields against library and improve field names
            if self.FieldLibrary and self.field_matcher:
                result = self._match_fields_with_library(result)
            else:
                result = self._ensure_meaningful_field_names(result)
            
            # Calculate metadata
            total_questions = 0
            for section in result.get('sections', []):
                # Count questions in elements array (new format)
                if 'elements' in section:
                    total_questions += sum(1 for elem in section['elements'] if elem.get('element_type') == 'question')
                # Also support old format with questions array for backward compatibility
                elif 'questions' in section:
                    total_questions += len(section['questions'])
            result['total_questions'] = total_questions
            
            # Estimate time if not provided
            if 'estimated_time_minutes' not in result or result['estimated_time_minutes'] == 0:
                result['estimated_time_minutes'] = max(10, total_questions * 2)  # 2 min per question
            
            result['extraction_model'] = self.model
            
            return result
            
        except Exception as e:
            raise Exception(f"AI interview extraction failed: {str(e)}")
    
    def _match_fields_with_library(self, interview_data):
        """
        Match extracted fields against the FieldLibrary
        Uses existing library fields when available, creates new ones when needed
        """
        for section in interview_data.get('sections', []):
            # Handle new format with elements array
            if 'elements' in section:
                for element in section['elements']:
                    if element.get('element_type') == 'question':
                        self._match_question_fields(element)
            # Handle old format with questions array for backward compatibility
            elif 'questions' in section:
                for question in section['questions']:
                    self._match_question_fields(question)
        
        return interview_data
    
    def _match_question_fields(self, question):
        """Match fields in a single question"""
        if question.get('question_type') == 'fields':
            # Match each field in the question
            matched_fields = []
            for field in question.get('fields', []):
                matched_field = self._match_single_field(field)
                matched_fields.append(matched_field)
            question['fields'] = matched_fields
        else:
            # For single-field questions (yesno, choice, signature)
            field_name = question.get('field_name')
            if field_name:
                matched_field = self._match_single_field({
                    'name': field_name,
                    'label': question.get('question_text'),
                    'field_type': question.get('question_type')
                })
                question['field_name'] = matched_field['name']
    
    def _match_single_field(self, field):
        """
        Match a single field against the library
        Returns the field with potentially updated name and configuration
        """
        field_name = field.get('name', '')
        field_label = field.get('label', '')
        
        # Try to match using field name first, then label
        matched_field = None
        confidence = 0.0
        
        if field_name:
            # Try exact match
            lib_field = self.FieldLibrary.query.filter_by(field_key=field_name).first()
            if lib_field:
                return lib_field.to_dict()
            
            # Try fuzzy match on name - FIXED: use find_match() instead of fuzzy_match()
            from field_matcher import FieldMatcher
            matched_field, confidence, match_type = FieldMatcher.find_match(field_name, self.FieldLibrary.query)
            if matched_field and confidence >= 0.7:
                return matched_field.to_dict()
        
        # If no match found, return the field as-is
        return field
    
    def _ensure_meaningful_field_names(self, interview_data):
        """
        Ensure all field names are meaningful (not generic like field_1, field_2)
        This is a fallback when FieldLibrary is not available
        """
        for section in interview_data.get('sections', []):
            # Handle new format with elements array
            if 'elements' in section:
                for element in section['elements']:
                    if element.get('element_type') == 'question':
                        self._ensure_question_field_names(element)
            # Handle old format with questions array for backward compatibility
            elif 'questions' in section:
                for question in section['questions']:
                    self._ensure_question_field_names(question)
        
        return interview_data
    
    def _ensure_question_field_names(self, question):
        """Ensure field names are meaningful in a single question"""
        if question.get('question_type') == 'fields':
            for field in question.get('fields', []):
                # If field name is generic, improve it
                if self._is_generic_name(field.get('name', '')):
                    field['name'] = self._generate_meaningful_name(field.get('label', ''))
        else:
            field_name = question.get('field_name', '')
            if self._is_generic_name(field_name):
                question['field_name'] = self._generate_meaningful_name(question.get('question_text', ''))
    
    def _is_generic_name(self, name):
        """Check if a field name is generic (field_1, question_2, etc.)"""
        return bool(re.match(r'^(field|question|input|data)_\d+$', name, re.IGNORECASE))
    
    def _generate_meaningful_name(self, label):
        """Generate a meaningful field name from a label"""
        # Convert to snake_case
        name = re.sub(r'[^a-zA-Z0-9\s]', '', label)
        name = re.sub(r'\s+', '_', name.strip())
        name = name.lower()
        # Limit length
        return name[:50] if name else 'field'
    

