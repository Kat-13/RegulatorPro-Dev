"""
Conditional Rule Validator
Validates conditional logic rules for dynamic form fields
"""

import json
from typing import Dict, List, Tuple, Any

class ConditionalRuleValidator:
    """Validates conditional logic rules"""
    
    # Supported trigger conditions
    VALID_CONDITIONS = [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'greater_than',
        'less_than',
        'greater_than_or_equal',
        'less_than_or_equal',
        'is_empty',
        'is_not_empty',
        'in_list',
        'not_in_list'
    ]
    
    # Supported actions
    VALID_ACTIONS = [
        'show',
        'hide',
        'enable',
        'disable',
        'set_required',
        'set_optional',
        'set_value',
        'clear_value',
        'calculate_fee'
    ]
    
    @staticmethod
    def validate_rule(rule: Dict[str, Any], available_fields: List[str]) -> Tuple[bool, str]:
        """
        Validate a single conditional rule
        
        Args:
            rule: Rule dictionary to validate
            available_fields: List of field names that exist in the form
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        
        # Check required fields
        if 'id' not in rule:
            return False, "Rule must have an 'id' field"
        
        if 'trigger_field' not in rule:
            return False, "Rule must have a 'trigger_field'"
        
        if 'trigger_condition' not in rule:
            return False, "Rule must have a 'trigger_condition'"
        
        if 'actions' not in rule or not isinstance(rule['actions'], list):
            return False, "Rule must have an 'actions' array"
        
        # Validate trigger field exists
        if rule['trigger_field'] not in available_fields:
            return False, f"Trigger field '{rule['trigger_field']}' does not exist in form"
        
        # Validate trigger condition
        if rule['trigger_condition'] not in ConditionalRuleValidator.VALID_CONDITIONS:
            return False, f"Invalid trigger condition: '{rule['trigger_condition']}'"
        
        # Validate trigger_value is present for conditions that need it
        value_required_conditions = [
            'equals', 'not_equals', 'contains', 'not_contains',
            'greater_than', 'less_than', 'greater_than_or_equal',
            'less_than_or_equal', 'in_list', 'not_in_list'
        ]
        
        if rule['trigger_condition'] in value_required_conditions:
            if 'trigger_value' not in rule:
                return False, f"Condition '{rule['trigger_condition']}' requires 'trigger_value'"
        
        # Validate actions
        if len(rule['actions']) == 0:
            return False, "Rule must have at least one action"
        
        for action in rule['actions']:
            is_valid, error = ConditionalRuleValidator._validate_action(action, available_fields)
            if not is_valid:
                return False, error
        
        return True, ""
    
    @staticmethod
    def _validate_action(action: Dict[str, Any], available_fields: List[str]) -> Tuple[bool, str]:
        """Validate a single action"""
        
        if 'action' not in action:
            return False, "Action must have an 'action' field"
        
        action_type = action['action']
        
        if action_type not in ConditionalRuleValidator.VALID_ACTIONS:
            return False, f"Invalid action type: '{action_type}'"
        
        # Validate target_fields for actions that need them
        field_required_actions = [
            'show', 'hide', 'enable', 'disable',
            'set_required', 'set_optional', 'set_value', 'clear_value'
        ]
        
        if action_type in field_required_actions:
            if 'target_fields' not in action or not isinstance(action['target_fields'], list):
                return False, f"Action '{action_type}' requires 'target_fields' array"
            
            if len(action['target_fields']) == 0:
                return False, f"Action '{action_type}' must have at least one target field"
            
            # Validate target fields exist
            for field_name in action['target_fields']:
                if field_name not in available_fields:
                    return False, f"Target field '{field_name}' does not exist in form"
        
        # Validate set_value action has value
        if action_type == 'set_value':
            if 'value' not in action:
                return False, "Action 'set_value' requires 'value' field"
        
        # Validate calculate_fee action has fee_modifier
        if action_type == 'calculate_fee':
            if 'fee_modifier' not in action:
                return False, "Action 'calculate_fee' requires 'fee_modifier' field"
            
            fee_modifier = action['fee_modifier']
            if 'type' not in fee_modifier or fee_modifier['type'] not in ['discount', 'surcharge', 'override']:
                return False, "fee_modifier must have valid 'type' (discount, surcharge, or override)"
            
            if 'amount' not in fee_modifier:
                return False, "fee_modifier must have 'amount' field"
            
            if 'unit' not in fee_modifier or fee_modifier['unit'] not in ['percent', 'fixed']:
                return False, "fee_modifier must have valid 'unit' (percent or fixed)"
        
        return True, ""
    
    @staticmethod
    def validate_rules(rules_json: str, available_fields: List[str]) -> Tuple[bool, List[str]]:
        """
        Validate all conditional rules
        
        Args:
            rules_json: JSON string containing rules array
            available_fields: List of field names that exist in the form
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        
        # Parse JSON
        try:
            rules_data = json.loads(rules_json)
        except json.JSONDecodeError as e:
            return False, [f"Invalid JSON: {str(e)}"]
        
        # Check structure
        if not isinstance(rules_data, list):
            return False, ["Rules must be an array"]
        
        # Validate each rule
        errors = []
        rule_ids = set()
        
        for i, rule in enumerate(rules_data):
            # Check for duplicate IDs
            rule_id = rule.get('id')
            if rule_id in rule_ids:
                errors.append(f"Rule {i+1}: Duplicate rule ID '{rule_id}'")
            rule_ids.add(rule_id)
            
            # Validate rule
            is_valid, error = ConditionalRuleValidator.validate_rule(rule, available_fields)
            if not is_valid:
                errors.append(f"Rule {i+1} (ID: {rule_id}): {error}")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def detect_conflicts(rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect conflicting rules (rules that affect the same target fields)
        
        Args:
            rules: List of rule dictionaries
            
        Returns:
            List of conflict descriptions
        """
        
        conflicts = []
        
        # Build a map of target_field -> rules that affect it
        field_to_rules = {}
        
        for rule in rules:
            for action in rule.get('actions', []):
                action_type = action.get('action')
                target_fields = action.get('target_fields', [])
                
                for field in target_fields:
                    if field not in field_to_rules:
                        field_to_rules[field] = []
                    
                    field_to_rules[field].append({
                        'rule_id': rule.get('id'),
                        'action': action_type,
                        'created_at': rule.get('created_at', '')
                    })
        
        # Find conflicts
        for field, affecting_rules in field_to_rules.items():
            if len(affecting_rules) > 1:
                # Check for conflicting actions
                show_hide_actions = [r for r in affecting_rules if r['action'] in ['show', 'hide']]
                enable_disable_actions = [r for r in affecting_rules if r['action'] in ['enable', 'disable']]
                required_optional_actions = [r for r in affecting_rules if r['action'] in ['set_required', 'set_optional']]
                
                if len(show_hide_actions) > 1:
                    # Sort by created_at to determine which wins
                    sorted_rules = sorted(show_hide_actions, key=lambda x: x['created_at'], reverse=True)
                    conflicts.append({
                        'field': field,
                        'type': 'show_hide',
                        'rules': [r['rule_id'] for r in show_hide_actions],
                        'winner': sorted_rules[0]['rule_id'],
                        'message': f"Multiple rules affect visibility of '{field}'. Most recent rule ({sorted_rules[0]['rule_id']}) will take precedence."
                    })
                
                if len(enable_disable_actions) > 1:
                    sorted_rules = sorted(enable_disable_actions, key=lambda x: x['created_at'], reverse=True)
                    conflicts.append({
                        'field': field,
                        'type': 'enable_disable',
                        'rules': [r['rule_id'] for r in enable_disable_actions],
                        'winner': sorted_rules[0]['rule_id'],
                        'message': f"Multiple rules affect enabled state of '{field}'. Most recent rule ({sorted_rules[0]['rule_id']}) will take precedence."
                    })
                
                if len(required_optional_actions) > 1:
                    sorted_rules = sorted(required_optional_actions, key=lambda x: x['created_at'], reverse=True)
                    conflicts.append({
                        'field': field,
                        'type': 'required_optional',
                        'rules': [r['rule_id'] for r in required_optional_actions],
                        'winner': sorted_rules[0]['rule_id'],
                        'message': f"Multiple rules affect required status of '{field}'. Most recent rule ({sorted_rules[0]['rule_id']}) will take precedence."
                    })
        
        return conflicts


# Example usage and tests
if __name__ == '__main__':
    # Test valid rule
    valid_rule = {
        'id': 'rule-1',
        'trigger_field': 'medicaid_status',
        'trigger_condition': 'equals',
        'trigger_value': 'Yes',
        'actions': [
            {
                'action': 'show',
                'target_fields': ['medicaid_program', 'medicaid_document']
            },
            {
                'action': 'set_required',
                'target_fields': ['medicaid_program']
            }
        ]
    }
    
    available_fields = ['medicaid_status', 'medicaid_program', 'medicaid_document']
    
    is_valid, error = ConditionalRuleValidator.validate_rule(valid_rule, available_fields)
    print(f"Valid rule test: {is_valid}, Error: {error}")
    
    # Test invalid rule (missing trigger_value)
    invalid_rule = {
        'id': 'rule-2',
        'trigger_field': 'medicaid_status',
        'trigger_condition': 'equals',
        # Missing trigger_value
        'actions': [
            {
                'action': 'show',
                'target_fields': ['medicaid_program']
            }
        ]
    }
    
    is_valid, error = ConditionalRuleValidator.validate_rule(invalid_rule, available_fields)
    print(f"Invalid rule test: {is_valid}, Error: {error}")
    
    # Test conflict detection
    conflicting_rules = [
        {
            'id': 'rule-1',
            'created_at': '2025-10-01',
            'actions': [{'action': 'show', 'target_fields': ['field_a']}]
        },
        {
            'id': 'rule-2',
            'created_at': '2025-10-15',
            'actions': [{'action': 'hide', 'target_fields': ['field_a']}]
        }
    ]
    
    conflicts = ConditionalRuleValidator.detect_conflicts(conflicting_rules)
    print(f"Conflicts detected: {len(conflicts)}")
    for conflict in conflicts:
        print(f"  - {conflict['message']}")

