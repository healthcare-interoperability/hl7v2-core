# @healthcare-interoperability/hl7v2-core

## Description
This npm package provides utilities and classes for handling HL7v2 messaging. It includes classes for primitive data types, complex data types, segments, and trigger events.

## Installation
To install the package, use npm:

```bash
npm install @healthcare-interoperability/hl7v2-core
```

## Usage Examples

### PrimitiveType
```javascript
import { PrimitiveType } from '@healthcare-interoperability/hl7v2-core';

const primitiveValue = new PrimitiveType('Hello');
console.log(primitiveValue.toString()); // Output: 'Hello'
console.log(primitiveValue.toJSON()); // Output: 'Hello'
```

### PrimitiveDataType
```javascript
import { PrimitiveDataType } from '@healthcare-interoperability/hl7v2-core';

const primitiveData = new PrimitiveDataType('World');
console.log(primitiveData.toString()); // Output: 'World'
console.log(primitiveData.toJSON()); // Output: 'World'
```

### ComplexType
```javascript
import { ComplexType } from '@healthcare-interoperability/hl7v2-core';

const complexValues = ['Value1', 'Value2'];
const complexInstance = new ComplexType(complexValues);
console.log(complexInstance.toString()); // Output: 'Value1^Value2'
console.log(complexInstance.toJSON()); // Output: ['Value1', 'Value2']
```

### ComplexDataType
```javascript
import { ComplexDataType } from '@healthcare-interoperability/hl7v2-core';

const complexDataValues = ['Data1', 'Data2'];
const complexDataInstance = new ComplexDataType(complexDataValues);
console.log(complexDataInstance.toString()); // Output: 'Data1^Data2'
console.log(complexDataInstance.toJSON()); // Output: ['Data1', 'Data2']
```

### Segment
```javascript
import { Segment } from '@healthcare-interoperability/hl7v2-core';

const segmentValues = 'PID|1|John Doe|...';
const segmentInstance = new Segment(segmentValues);
console.log(segmentInstance.toString()); // Output: 'PID|1|John Doe|...'
console.log(segmentInstance.toJSON()); // Output: { PID: { ... } }
```

### TriggerEvent
```javascript
import { TriggerEvent } from '@healthcare-interoperability/hl7v2-core';

const hl7Message = 'MSH|^~\\&|...';
const triggerEventInstance = new TriggerEvent(hl7Message);
console.log(triggerEventInstance.toJSON()); // Output: Parsed JSON representation of the HL7 message
```

## API Reference

### PrimitiveType
- `toString()`: Returns the string representation of the primitive value.
- `toJSON()`: Returns the JSON representation of the primitive value.

### PrimitiveDataType extends PrimitiveType
- Inherits methods from `PrimitiveType`.

### ComplexType
- `setValues(values)`: Sets values based on array, object, or primitive data.
- `toString()`: Returns a string representation of the complex type.
- `toJSON()`: Returns a JSON representation of the complex type.

### ComplexDataType extends ComplexType
- Inherits methods from `ComplexType`.

### Segment extends ComplexType
- `toString()`: Returns a string representation of the segment.
- `toJSON()`: Returns a JSON representation of the segment.

### TriggerEvent
- `toJSON(mode, flag)`: Returns a JSON representation of the parsed HL7 message.
- `setCustomSegments(segmentId, segmentInstance)`: Sets custom segments to the TriggerEvent instance.

HL7®, FHIR® and the FHIR  are the registered trademarks of Health Level Seven International and their use does not constitute endorsement by HL7.