import { ComplexDataType } from "./ComplexDataType.js";
import { ComplexType } from "./ComplexType.js";
import { PrimitiveDataType } from "./PrimitiveDataType.js";

export class Segment extends ComplexType {

    constructor(values, configs, isSubComponent = false) {
        super(values, configs, false);
        this.setVersion(configs?.version ?? process.env.HL7v2Version ?? '2.5.1');
        this.setDelimiter(configs?.delimiter ?? process.env.fieldDelimiter ?? '|');
        this.setRepeatationDelimiter(configs?.repeatationDelimiter ?? process.env.repeatationDelimiter ?? '~');
        this.setSubComponentDelimiter(configs?.subDelimiter ?? process.env.subComponentDelimiter ?? '^');
        this.primitiveIndex = 1;

    }

    setRepeatationDelimiter(repeatationDelimiter) {
        this.repeatationDelimiter = repeatationDelimiter;
    }

    setSegmentType(segmentType) {
        this.segmentType = segmentType;
    }

    setValuesByPrimitiveData(values) {
        if (typeof values === 'string') {
            let splitedData = values.split(this.delimiter);
            if (splitedData.length > 1) {
                if (splitedData[0] === this.segmentType) {
                    splitedData.shift();
                }
                this.setValuesByArray(splitedData);
                return;
            }
        }
        if (this.primitiveIndex) {
            this.setDataToIndex(this.primitiveIndex, values);
        }
        return;
    }

    // Utility method to prepare array values
    prepareArrayValues(value, dataType) {
        if (Array.isArray(value)) {
            return value.map(valueItem => (
                value instanceof dataType ? valueItem : new dataType(valueItem, { version: this.version, delimiter: this.subDelimiter })
            ));
        } else {
            const valueRepetitions = value.split(this.repetitionDelimiter);
            return valueRepetitions.map(valueItem => (
                new dataType(valueItem, { version: this.version, delimiter: this.subDelimiter })
            ));
        }
    }

    // setComponentValue(component, value) {
    //     const componentConfig = this.getComponentConfig(component);
    //     const dataType = this.getDataTypeInstance(component, this.version);

    //     if (componentConfig.isArray) {
    //         const preparedValues = this.prepareArrayValues(value, dataType);
    //         if (componentConfig.position) {
    //             this.values[componentConfig.position] = preparedValues;
    //         }
    //     } else {
    //         super.setComponentValue(component, value);
    //     }
    // }

    setComponentValue(component, value) {
        const componentConfig = this.getComponentConfig(component);
        const dataType = this.getDataTypeInstance(component, this.version);

        if (componentConfig.isArray) {
            let preparedValues = [];
            console.log('component', component, componentConfig.isArray);
            if (Array.isArray(value)) {
                value.forEach(valueItem => {
                    if (value instanceof dataType) {
                        preparedValues.push(valueItem);
                    } else {
                        preparedValues.push(dataType ? new dataType(valueItem, {
                            version: this.version, delimiter:
                                this.subDelimiter
                        }) : null);
                    }
                });
            } else {
                if(typeof value === 'object'){
                        preparedValues.push(dataType ? new dataType(value, {
                            version: this.version, delimiter:
                                this.subDelimiter
                        }) : null);
                } else {
                    let valueRepeatation = value.split(this.repeatationDelimiter);
                    console.log(valueRepeatation);
                    valueRepeatation.forEach(valueItem => {
                        preparedValues.push(dataType ? new dataType(valueItem, {
                            version: this.version, delimiter:
                                this.subDelimiter
                        }) : null);
                    });
                }
                console.log((component, value));
            }
            if(componentConfig.position){
                this.values[componentConfig.position] = preparedValues;
            }
        } else {
            if (value instanceof dataType) {
                this.values[component] = value;
            } else {
                this.setDataTypeValue(component, value);
            }
        }
    }



    toString(){
        const tempValues = this.values.slice(1);
        const segmentValues = tempValues.map(value => {
            if (Array.isArray(value)) {
                return value.map(valueItem => (valueItem.toString())).join(this.repetitionDelimiter);
            }
            return value.toString();
        }).join(this.delimiter);

        return `${this.segmentType}${this.delimiter}${segmentValues}`;
    }

    extractDataByExtractioMethod(componentValue, method = 'toJSON'){
        if(Array.isArray(componentValue)){
            return componentValue.map(componentValueItem => {
                return super.extractDataByExtractioMethod(componentValueItem, method);
            });
        } else {
            return super.extractDataByExtractioMethod(componentValue, method);
        }
    }
}