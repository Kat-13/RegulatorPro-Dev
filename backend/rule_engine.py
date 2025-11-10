"""
Rule Engine for Regulatory Platform
Evaluates rules for fee calculation, application routing, and conditional requirements
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class RuleEngine:
    """
    Main rule engine class that evaluates rules against application data
    """
    
    def __init__(self, rules_dir='rules'):
        """Initialize rule engine with rules directory"""
        self.rules_dir = rules_dir
        os.makedirs(rules_dir, exist_ok=True)
        
    def evaluate_rules(self, application_data: Dict[str, Any], rule_type: str = 'all') -> Dict[str, Any]:
        """
        Evaluate all rules for an application
        
        Args:
            application_data: Dictionary containing application fields and values
            rule_type: Type of rules to evaluate ('fee', 'routing', 'requirements', 'all')
            
        Returns:
            Dictionary with evaluation results
        """
        results = {
            'fees': {},
            'routing': {},
            'requirements': [],
            'status_changes': [],
            'penalties': [],
            'total_fee': 0
        }
        
        # Load rules for the board
        board_id = application_data.get('board_id', 'default')
        rules = self.load_rules(board_id)
        
        if not rules:
            return results
            
        # Evaluate each rule
        for rule in rules:
            if rule_type != 'all' and rule.get('type') != rule_type:
                continue
                
            if self._evaluate_conditions(rule.get('conditions', []), application_data):
                self._execute_actions(rule.get('actions', []), application_data, results)
        
        # Calculate total fee
        results['total_fee'] = self._calculate_total_fee(results)
        
        return results
    
    def _evaluate_conditions(self, conditions: List[Dict], data: Dict) -> bool:
        """
        Evaluate if all conditions are met
        
        Args:
            conditions: List of condition dictionaries
            data: Application data to evaluate against
            
        Returns:
            True if all conditions are met, False otherwise
        """
        if not conditions:
            return True
            
        for condition in conditions:
            field = condition.get('field')
            operator = condition.get('operator')
            value = condition.get('value')
            
            # Get field value from data
            field_value = self._get_field_value(field, data)
            
            # Evaluate condition
            if not self._compare_values(field_value, operator, value):
                return False
                
        return True
    
    def _get_field_value(self, field_path: str, data: Dict) -> Any:
        """
        Get field value from nested data structure
        
        Args:
            field_path: Dot-notation field path (e.g., 'user.email')
            data: Data dictionary
            
        Returns:
            Field value or None
        """
        parts = field_path.split('.')
        value = data
        
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None
                
        return value
    
    def _compare_values(self, field_value: Any, operator: str, compare_value: Any) -> bool:
        """
        Compare two values using the specified operator
        
        Args:
            field_value: Value from application data
            operator: Comparison operator (=, !=, >, <, >=, <=, contains, in)
            compare_value: Value to compare against
            
        Returns:
            True if comparison is true, False otherwise
        """
        if field_value is None:
            return False
            
        try:
            if operator == '==' or operator == '=':
                return str(field_value).lower() == str(compare_value).lower()
            elif operator == '!=':
                return str(field_value).lower() != str(compare_value).lower()
            elif operator == '>':
                return float(field_value) > float(compare_value)
            elif operator == '<':
                return float(field_value) < float(compare_value)
            elif operator == '>=':
                return float(field_value) >= float(compare_value)
            elif operator == '<=':
                return float(field_value) <= float(compare_value)
            elif operator == 'contains':
                return str(compare_value).lower() in str(field_value).lower()
            elif operator == 'in':
                return str(field_value).lower() in [str(v).lower() for v in compare_value]
            else:
                return False
        except (ValueError, TypeError):
            return False
    
    def _execute_actions(self, actions: List[Dict], data: Dict, results: Dict):
        """
        Execute rule actions and update results
        
        Args:
            actions: List of action dictionaries
            data: Application data
            results: Results dictionary to update
        """
        for action in actions:
            action_type = action.get('type')
            
            if action_type == 'set_fee':
                self._action_set_fee(action, data, results)
            elif action_type == 'add_fee':
                self._action_add_fee(action, data, results)
            elif action_type == 'multiply_fee':
                self._action_multiply_fee(action, data, results)
            elif action_type == 'apply_penalty':
                self._action_apply_penalty(action, data, results)
            elif action_type == 'route_to':
                self._action_route_to(action, data, results)
            elif action_type == 'require_document':
                self._action_require_document(action, data, results)
            elif action_type == 'set_status':
                self._action_set_status(action, data, results)
            elif action_type == 'waive_fee':
                self._action_waive_fee(action, data, results)
    
    def _action_set_fee(self, action: Dict, data: Dict, results: Dict):
        """Set a fee to a specific amount"""
        fee_name = action.get('fee_name', 'base_fee')
        amount = action.get('amount', 0)
        results['fees'][fee_name] = float(amount)
    
    def _action_add_fee(self, action: Dict, data: Dict, results: Dict):
        """Add a fee to existing fees"""
        fee_name = action.get('fee_name', 'additional_fee')
        amount = action.get('amount', 0)
        current = results['fees'].get(fee_name, 0)
        results['fees'][fee_name] = current + float(amount)
    
    def _action_multiply_fee(self, action: Dict, data: Dict, results: Dict):
        """Multiply a fee by a factor"""
        fee_name = action.get('fee_name', 'base_fee')
        multiplier = action.get('multiplier', 1.0)
        
        if fee_name in results['fees']:
            results['fees'][fee_name] *= float(multiplier)
    
    def _action_apply_penalty(self, action: Dict, data: Dict, results: Dict):
        """Apply a penalty (percentage or flat)"""
        penalty_type = action.get('penalty_type', 'percentage')
        amount = action.get('amount', 0)
        base_fee_name = action.get('base_fee', 'base_fee')
        
        penalty_info = {
            'type': penalty_type,
            'amount': amount,
            'description': action.get('description', 'Penalty applied')
        }
        
        if penalty_type == 'percentage':
            base_fee = results['fees'].get(base_fee_name, 0)
            # If no base fee exists, skip penalty calculation
            if base_fee == 0:
                penalty_info['error'] = f'Base fee "{base_fee_name}" not found. Cannot calculate penalty.'
                return results
            penalty_amount = base_fee * (float(amount) / 100)
            penalty_info['calculated_amount'] = penalty_amount
            results['fees']['penalty'] = results['fees'].get('penalty', 0) + penalty_amount
        else:  # flat
            results['fees']['penalty'] = results['fees'].get('penalty', 0) + float(amount)
            penalty_info['calculated_amount'] = float(amount)
        
        results['penalties'].append(penalty_info)
    
    def _action_route_to(self, action: Dict, data: Dict, results: Dict):
        """Route application to specific queue or staff"""
        results['routing'] = {
            'queue': action.get('queue'),
            'staff': action.get('staff'),
            'priority': action.get('priority', 'normal'),
            'reason': action.get('reason', 'Rule-based routing')
        }
    
    def _action_require_document(self, action: Dict, data: Dict, results: Dict):
        """Add a required document"""
        results['requirements'].append({
            'type': 'document',
            'document_name': action.get('document_name'),
            'description': action.get('description'),
            'required': True
        })
    
    def _action_set_status(self, action: Dict, data: Dict, results: Dict):
        """Set application status"""
        results['status_changes'].append({
            'new_status': action.get('status'),
            'reason': action.get('reason', 'Rule-based status change')
        })
    
    def _action_waive_fee(self, action: Dict, data: Dict, results: Dict):
        """Waive a specific fee"""
        fee_name = action.get('fee_name', 'base_fee')
        waiver_reason = action.get('reason', 'Fee waived')
        
        if fee_name in results['fees']:
            results['fees'][fee_name] = 0
            results['fees'][f'{fee_name}_waived'] = True
            results['fees'][f'{fee_name}_waiver_reason'] = waiver_reason
    
    def _calculate_total_fee(self, results: Dict) -> float:
        """Calculate total fee from all fee components"""
        total = 0
        for fee_name, amount in results['fees'].items():
            if not fee_name.endswith('_waived') and not fee_name.endswith('_waiver_reason'):
                total += float(amount)
        return round(total, 2)
    
    def load_rules(self, board_id: str) -> List[Dict]:
        """
        Load rules for a specific board
        
        Args:
            board_id: Board identifier
            
        Returns:
            List of rule dictionaries
        """
        rules_file = os.path.join(self.rules_dir, f'{board_id}_rules.json')
        
        if not os.path.exists(rules_file):
            return []
            
        try:
            with open(rules_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading rules: {e}")
            return []
    
    def save_rules(self, board_id: str, rules: List[Dict]) -> bool:
        """
        Save rules for a specific board
        
        Args:
            board_id: Board identifier
            rules: List of rule dictionaries
            
        Returns:
            True if successful, False otherwise
        """
        rules_file = os.path.join(self.rules_dir, f'{board_id}_rules.json')
        
        try:
            with open(rules_file, 'w') as f:
                json.dump(rules, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving rules: {e}")
            return False
    
    def get_sample_rules(self) -> List[Dict]:
        """
        Get sample rules for testing and demonstration
        
        Returns:
            List of sample rule dictionaries
        """
        return [
            {
                "rule_id": "base_fee_professional",
                "name": "Base Fee - Professional License",
                "type": "fee",
                "conditions": [
                    {"field": "licenseType", "operator": "=", "value": "professional"}
                ],
                "actions": [
                    {"type": "set_fee", "fee_name": "base_fee", "amount": 500}
                ]
            },
            {
                "rule_id": "base_fee_business",
                "name": "Base Fee - Business License",
                "type": "fee",
                "conditions": [
                    {"field": "licenseType", "operator": "=", "value": "business"}
                ],
                "actions": [
                    {"type": "set_fee", "fee_name": "base_fee", "amount": 1000}
                ]
            },
            {
                "rule_id": "late_penalty",
                "name": "Late Submission Penalty - 25%",
                "type": "fee",
                "conditions": [
                    {"field": "days_late", "operator": ">", "value": 0}
                ],
                "actions": [
                    {
                        "type": "apply_penalty",
                        "penalty_type": "percentage",
                        "amount": 25,
                        "base_fee": "base_fee",
                        "description": "25% late submission penalty"
                    }
                ]
            },
            {
                "rule_id": "military_waiver",
                "name": "Military Spouse Fee Waiver",
                "type": "fee",
                "conditions": [
                    {"field": "military_spouse", "operator": "=", "value": "true"}
                ],
                "actions": [
                    {
                        "type": "waive_fee",
                        "fee_name": "base_fee",
                        "reason": "Military spouse fee waiver"
                    }
                ]
            },
            {
                "rule_id": "disclosure_routing",
                "name": "Route to Board Review if Disclosure",
                "type": "routing",
                "conditions": [
                    {"field": "criminalHistory", "operator": "=", "value": "yes"}
                ],
                "actions": [
                    {
                        "type": "route_to",
                        "queue": "board_review",
                        "priority": "high",
                        "reason": "Criminal history disclosure requires board review"
                    }
                ]
            },
            {
                "rule_id": "endorsement_proof_employment",
                "name": "Require Proof of Employment for Endorsement",
                "type": "requirements",
                "conditions": [
                    {"field": "licenseType", "operator": "=", "value": "endorsement"},
                    {"field": "years_since_exam", "operator": ">", "value": 5}
                ],
                "actions": [
                    {
                        "type": "require_document",
                        "document_name": "proof_of_employment",
                        "description": "Proof of employment for 3 of last 5 years required"
                    }
                ]
            }
        ]

