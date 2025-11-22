"""
Enhanced AI-powered PDF to Interview Converter
COMPLETE FILE - Just copy this entire thing and save as enhanced_pdf_interview_extractor.py

This replaces your old pdf_interview_extractor.py with smart features:
- Conditional logic detection ("If Yes, explain...")
- Repeating sections (employment, courses)
- Better field type detection
- 100% backward compatible with your existing code
"""

import os
import json
import re
from openai import OpenAI

class EnhancedPDFInterviewExtractor:
    """
    Enhanced version with smart form parsing, conditional logic, and better structure
    Drop-in replacement for PDFInterviewExtractor with additional features
    """
    
    def __init__(self, db=None, FieldLibrary=None):
        # OpenAI client is pre-configured via environment variables
        self.client = OpenAI()
        self.model = "gpt-4.1-mini"  # CORRECT MODEL for your system
        self.db = db
        self.FieldLibrary = FieldLibrary
        
        # Import FieldMatcher for field matching
        if FieldLibrary:
            try:
                from field_matcher import FieldMatcher
                self.field_matcher = FieldMatcher
            except ImportError:
                self.field_matcher = None
        else:
            self.field_matcher = None
    
    def extract_interview_from_pdf(self, pdf_path, enable_smart_features=True):
        """
        Extract interview structure from a PDF file
        
        Args:
            pdf_path: Path to the PDF file
            enable_smart_features: Enable conditional logic and enhanced parsing
            
        Returns:
            dict with interview structure compatible with your existing format
            PLUS new features: conditional_logic, field_metadata, enhanced_structure
        """
        # Read PDF content
        pdf_text = self._extract_text_from_pdf(pdf_path)
        
        # Use OpenAI to analyze and create interview structure
        if enable_smart_features:
            interview_structure = self._analyze_with_enhanced_ai(pdf_text)
        else:
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
    
    def _analyze_with_enhanced_ai(self, pdf_text):
        """
        NEW: Enhanced AI analysis with conditional logic, better field detection,
        and smarter organization
        """
        
        system_prompt = """You are an expert at converting government and regulatory forms into intelligent, user-friendly interview-style questionnaires with conditional logic.

CRITICAL INSTRUCTIONS:
1. Extract ALL content: fields, questions, instruction blocks, and conditional relationships
2. Identify conditional logic (e.g., "If Yes, explain...")
3. Detect repeating sections (employment history, courses, etc.)
4. Preserve exact order from the PDF
5. Create 5-20 logical sections
6. Use meaningful field names (snake_case)
7. Detect field types accurately (text, email, tel, date, etc.)

CONDITIONAL LOGIC:
When you see patterns like:
- "If Yes, explain..." 
- "If you answered Yes to question X..."
- "Required only if..."

Create conditional_on and conditional_value fields.

Example:
Question: "Have you been convicted? Yes [ ] No [ ]"
Follow-up: "If Yes, provide details:"

This becomes TWO questions:
1. Regular yes/no question (field: convicted)
2. Conditional question with conditional_on: "convicted", conditional_value: "Yes"

REPEATING SECTIONS:
For sections like "Employment History (list last 5 positions)", create a repeating section with:
- repeating: true
- min_entries: 1
- max_entries: 5

Return ONLY valid JSON in this format:
{
  "interview_name": "Application Name",
  "description": "What this application collects",
  "estimated_time_minutes": 20,
  "sections": [
    {
      "title": "Section Title",
      "description": "What this section covers",
      "repeating": false,
      "min_entries": null,
      "max_entries": null,
      "elements": [
        {
          "element_type": "instruction_block",
          "title": "Important Note",
          "content": "Instructions text here",
          "style": "info"
        },
        {
          "element_type": "question",
          "question_text": "Have you been convicted of a felony?",
          "question_type": "yesno",
          "field_name": "convicted_felony",
          "required": true,
          "conditional_on": null,
          "conditional_value": null
        },
        {
          "element_type": "question",
          "question_text": "Please provide details of the conviction",
          "question_type": "fields",
          "conditional_on": "convicted_felony",
          "conditional_value": "Yes",
          "fields": [
            {
              "name": "conviction_date",
              "label": "Date of Conviction",
              "field_type": "date",
              "required": true,
              "placeholder": "",
              "help_text": "Attach certified copy of final judgment"
            }
          ]
        }
      ]
    }
  ]
}

Element types: "instruction_block", "question"
Instruction styles: "info", "warning", "alert"
Question types: "fields", "yesno", "choice", "signature", "file_upload"
Field types: text, email, tel, number, date, select, checkbox, textarea, file

IMPORTANT: Always include conditional_on and conditional_value fields (set to null if not conditional)."""

        user_prompt = f"""Extract this form into an intelligent interview structure with conditional logic and repeating sections.

Form content:
{pdf_text}

REQUIREMENTS:
- Extract EVERY field and instruction
- Identify ALL conditional relationships ("If Yes...", "Required only if...")
- Detect repeating sections (employment, education, courses)
- Preserve exact PDF order
- Create 5-20 sections by topic
- Use meaningful snake_case field names
- Detect proper field types (date, email, tel, etc.)
- Set appropriate instruction styles (info/warning/alert)
- Return ONLY valid JSON"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            
            # Parse the JSON response
            result = json.loads(response.choices[0].message.content)
            
            # Post-process: match fields, improve names, validate structure
            try:
                if self.FieldLibrary and self.field_matcher:
                    result = self._match_fields_with_library(result)
                else:
                    result = self._ensure_meaningful_field_names(result)
            except Exception as post_process_error:
                # If post-processing fails, log but continue with raw result
                print(f"Warning: Post-processing failed: {post_process_error}")
                # Ensure basic structure exists
                if 'sections' not in result:
                    result['sections'] = []
                # Ensure all fields have names
                for section in result.get('sections', []):
                    for question in section.get('questions', []):
                        if 'field_name' not in question or not question['field_name']:
                            question['field_name'] = self._generate_meaningful_name(question.get('question_text', 'field'))
            
            # Calculate metadata
            total_questions = 0
            for section in result.get('sections', []):
                if 'elements' in section:
                    total_questions += sum(1 for elem in section['elements'] if elem.get('element_type') == 'question')
                elif 'questions' in section:
                    total_questions += len(section['questions'])
            
            result['total_questions'] = total_questions
            
            if 'estimated_time_minutes' not in result or result['estimated_time_minutes'] == 0:
                result['estimated_time_minutes'] = max(10, total_questions * 2)
            
            result['extraction_model'] = self.model
            result['enhanced_features'] = True
            
            return result
            
        except Exception as e:
            raise Exception(f"AI interview extraction failed: {str(e)}")
    
    def _analyze_with_ai(self, pdf_text):
        """
        EXISTING: Original AI analysis method for backward compatibility
        Use this if you want the original behavior
        """
        
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
- **PRESERVE THE EXACT ORDER** elements appear in the PDF - instruction blocks and questions must appear in the same sequence as the original form
- **DISTRIBUTE instruction blocks throughout the appropriate sections** - do NOT group all instruction blocks together
- Place each instruction block in the section where it appears in the PDF, immediately before its related questions
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
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            if self.FieldLibrary and self.field_matcher:
                result = self._match_fields_with_library(result)
            else:
                result = self._ensure_meaningful_field_names(result)
            
            total_questions = 0
            for section in result.get('sections', []):
                if 'elements' in section:
                    total_questions += sum(1 for elem in section['elements'] if elem.get('element_type') == 'question')
                elif 'questions' in section:
                    total_questions += len(section['questions'])
            result['total_questions'] = total_questions
            
            if 'estimated_time_minutes' not in result or result['estimated_time_minutes'] == 0:
                result['estimated_time_minutes'] = max(10, total_questions * 2)
            
            result['extraction_model'] = self.model
            
            return result
            
        except Exception as e:
            raise Exception(f"AI interview extraction failed: {str(e)}")
    
    def _match_fields_with_library(self, interview_data):
        """Match extracted fields against the FieldLibrary"""
        for section in interview_data.get('sections', []):
            if 'elements' in section:
                for element in section['elements']:
                    if element.get('element_type') == 'question':
                        self._match_question_fields(element)
            elif 'questions' in section:
                for question in section['questions']:
                    self._match_question_fields(question)
        
        return interview_data
    
    def _match_question_fields(self, question):
        """Match fields in a single question"""
        if question.get('question_type') == 'fields':
            matched_fields = []
            for field in question.get('fields', []):
                matched_field = self._match_single_field(field)
                matched_fields.append(matched_field)
            question['fields'] = matched_fields
        else:
            field_name = question.get('field_name')
            if field_name:
                matched_field = self._match_single_field({
                    'name': field_name,
                    'label': question.get('question_text'),
                    'field_type': question.get('question_type')
                })
                question['field_name'] = matched_field.get('name', field_name) if isinstance(matched_field, dict) else field_name
    
    def _match_single_field(self, field):
        """Match a single field against the library"""
        # FIX: Ensure field has a 'name' key
        if not isinstance(field, dict):
            return {'name': 'field', 'label': 'Field', 'field_type': 'text', 'required': False}
        
        field_name = field.get('name', '')
        
        # FIX: If no name at all, generate one from label
        if not field_name:
            field_name = self._generate_meaningful_name(field.get('label', 'field'))
            field['name'] = field_name
        
        if field_name and self.FieldLibrary:
            lib_field = self.FieldLibrary.query.filter_by(field_key=field_name).first()
            if lib_field:
                return lib_field.to_dict()
            
            if self.field_matcher:
                from field_matcher import FieldMatcher
                matched_field, confidence, match_type = FieldMatcher.find_match(field_name, self.FieldLibrary.query)
                if matched_field and confidence >= 0.7:
                    return matched_field.to_dict()
        
        # Ensure all required keys exist
        return {
            'name': field.get('name', field_name),
            'label': field.get('label', 'Field'),
            'field_type': field.get('field_type', 'text'),
            'required': field.get('required', False)
        }
    
    def _ensure_meaningful_field_names(self, interview_data):
        """Ensure all field names are meaningful"""
        for section in interview_data.get('sections', []):
            if 'elements' in section:
                for element in section['elements']:
                    if element.get('element_type') == 'question':
                        self._ensure_question_field_names(element)
            elif 'questions' in section:
                for question in section['questions']:
                    self._ensure_question_field_names(question)
        
        return interview_data
    
    def _ensure_question_field_names(self, question):
        """Ensure field names are meaningful in a single question"""
        if question.get('question_type') == 'fields':
            for field in question.get('fields', []):
                if self._is_generic_name(field.get('name', '')):
                    field['name'] = self._generate_meaningful_name(field.get('label', ''))
        else:
            field_name = question.get('field_name', '')
            if self._is_generic_name(field_name):
                question['field_name'] = self._generate_meaningful_name(question.get('question_text', ''))
    
    def _is_generic_name(self, name):
        """Check if a field name is generic"""
        return bool(re.match(r'^(field|question|input|data)_\d+$', name, re.IGNORECASE))
    
    def _generate_meaningful_name(self, label):
        """Generate a meaningful field name from a label"""
        name = re.sub(r'[^a-zA-Z0-9\s]', '', label)
        name = re.sub(r'\s+', '_', name.strip())
        name = name.lower()
        return name[:50] if name else 'field'


# Backward compatibility: Keep original class name as alias
PDFInterviewExtractor = EnhancedPDFInterviewExtractor
PDFInterviewExtractor = EnhancedPDFInterviewExtractor
