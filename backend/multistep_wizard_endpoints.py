"""
Multi-Step Wizard API Endpoints
Handles draft save, resume, and step navigation functionality
"""

from flask import jsonify, request
from datetime import datetime
import json

def register_multistep_endpoints(app, db, ApplicationSubmission, ApplicationType):
    """Register multi-step wizard endpoints with the Flask app"""
    
    @app.route('/api/application-submissions/<int:submission_id>/save-progress', methods=['PUT'])
    def save_application_progress(submission_id):
        """Save draft progress for a multi-step application"""
        try:
            submission = ApplicationSubmission.query.get(submission_id)
            if not submission:
                return jsonify({'error': 'Submission not found'}), 404
            
            # Only allow saving drafts
            if hasattr(submission, 'is_draft') and not submission.is_draft:
                return jsonify({'error': 'Cannot update a submitted application'}), 400
            
            data = request.json
            
            # Update form data
            if 'formData' in data:
                submission.form_data = json.dumps(data['formData'])
            
            # Update current step
            if 'currentStep' in data:
                submission.current_step = data['currentStep']
            
            # Update steps completed
            if 'stepsCompleted' in data:
                submission.steps_completed = json.dumps(data['stepsCompleted'])
            
            # Update last saved timestamp
            submission.last_saved_at = datetime.utcnow()
            
            # Ensure it's marked as draft
            if hasattr(submission, 'is_draft'):
                submission.is_draft = True
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Progress saved successfully',
                'submission': submission.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/application-submissions/user/<int:user_id>/drafts', methods=['GET'])
    def get_user_drafts(user_id):
        """Get all draft applications for a user"""
        try:
            # Query for drafts only
            query = ApplicationSubmission.query.filter_by(user_id=user_id)
            
            # Filter by is_draft if column exists
            if hasattr(ApplicationSubmission, 'is_draft'):
                query = query.filter_by(is_draft=True)
            else:
                # Fallback: filter by status
                query = query.filter_by(status='draft')
            
            # Order by last saved (most recent first)
            if hasattr(ApplicationSubmission, 'last_saved_at'):
                query = query.order_by(ApplicationSubmission.last_saved_at.desc())
            else:
                query = query.order_by(ApplicationSubmission.updated_at.desc())
            
            drafts = query.all()
            
            # Enrich with application type info
            result = []
            for draft in drafts:
                draft_dict = draft.to_dict()
                
                # Add application type details
                if draft.application_type:
                    draft_dict['applicationType'] = {
                        'id': draft.application_type.id,
                        'name': draft.application_type.name,
                        'steps': json.loads(draft.application_type.steps) if draft.application_type.steps else None
                    }
                
                result.append(draft_dict)
            
            return jsonify(result), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/application-submissions/<int:submission_id>/finalize', methods=['POST'])
    def finalize_application(submission_id):
        """Finalize and submit a multi-step application"""
        try:
            submission = ApplicationSubmission.query.get(submission_id)
            if not submission:
                return jsonify({'error': 'Submission not found'}), 404
            
            # Check if already submitted
            if hasattr(submission, 'is_draft') and not submission.is_draft:
                return jsonify({'error': 'Application has already been submitted'}), 400
            
            # Mark as submitted
            submission.status = 'submitted'
            submission.submitted_at = datetime.utcnow()
            
            if hasattr(submission, 'is_draft'):
                submission.is_draft = False
            
            # Clear step tracking (no longer needed)
            if hasattr(submission, 'current_step'):
                submission.current_step = None
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Application submitted successfully',
                'submission': submission.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/application-types/<int:type_id>/steps', methods=['GET'])
    def get_application_type_steps(type_id):
        """Get step configuration for an application type"""
        try:
            app_type = ApplicationType.query.get(type_id)
            if not app_type:
                return jsonify({'error': 'Application type not found'}), 404
            
            steps = json.loads(app_type.steps) if app_type.steps else None
            
            return jsonify({
                'applicationTypeId': type_id,
                'applicationTypeName': app_type.name,
                'steps': steps
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/application-types/<int:type_id>/steps', methods=['PUT'])
    def update_application_type_steps(type_id):
        """Update step configuration for an application type"""
        try:
            app_type = ApplicationType.query.get(type_id)
            if not app_type:
                return jsonify({'error': 'Application type not found'}), 404
            
            data = request.json
            steps_config = data.get('steps')
            
            if steps_config is None:
                # Disable multi-step wizard
                app_type.steps = None
            else:
                # Validate steps structure
                if not isinstance(steps_config, dict):
                    return jsonify({'error': 'Steps must be an object'}), 400
                
                if 'enabled' not in steps_config:
                    return jsonify({'error': 'Steps must have "enabled" property'}), 400
                
                if steps_config.get('enabled') and 'steps' not in steps_config:
                    return jsonify({'error': 'Enabled wizard must have "steps" array'}), 400
                
                # Save steps configuration
                app_type.steps = json.dumps(steps_config)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Steps configuration updated successfully',
                'steps': json.loads(app_type.steps) if app_type.steps else None
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    print("✅ Multi-step wizard endpoints registered")
