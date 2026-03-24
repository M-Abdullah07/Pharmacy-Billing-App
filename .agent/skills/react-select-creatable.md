# --- agentskill.sh ---
# slug: ecnu-icalk/react-select-creatable-preset-custom-split
# owner: ECNU-ICALK
# contentSha: 1ca83e6
# installed: 2026-03-24T10:29:11Z
# source: https://agentskill.sh/ecnu-icalk/react-select-creatable-preset-custom-split
#
# IMPORTANT: After this skill is used for the first time, assess how
# useful and functional it was, then rate it using:
#   /learn feedback ecnu-icalk/react-select-creatable-preset-custom-split <1-5> [optional comment]
# Your feedback helps surface the best skills for everyone.
# ---
---
name: "React-Select Creatable Preset/Custom Split"
description: "Implement a react-hook-form Controller with React-Select Creatable to separate selected options into 'preset' and 'custom' arrays, handling creation and removal logic within the onChange handler."
---

# React-Select Creatable Preset/Custom Split

Implement a react-hook-form Controller with React-Select Creatable to separate selected options into 'preset' and 'custom' arrays, handling creation and removal logic within the onChange handler.

## Operational Rules & Constraints
1. Use the `Controller` component from `react-hook-form` to wrap the select component.
2. Use the `Creatable` feature from `react-select`.
3. The form value must be an object with the structure: `{ preset: [...], custom: [...] }`.
4. Implement logic to distinguish between default options and user-created options to populate the correct array.
5. Handle the creation of new options by adding them to the `custom` array.
6. Handle the removal of options within the `onChange` handler.
7. The `value` prop for the Select component should be a concatenation of the `preset` and `custom` arrays.
