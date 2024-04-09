import { PrimitiveType } from "./PrimitiveType";

export class ComplexType{
    static components = {};
    constructor(values, configs, isSubComponent = false){
        this.values = [];
        this.setVersion(configs?.version ?? process.env.HL7v2Version ?? '2.5.1');
        this.setDelimiter(configs?.delimiter ?? process.env.componentDelimiter ?? '^');
        if(!isSubComponent){
            this.setSubComponentDelimiter(configs?.subDelimiter ?? process.env.subComponentDelimiter ?? '&');
        }
        this.primitiveIndex = 1;
        this.setArrayStartIndex();
        this.setValues(values);
    }

    setArrayStartIndex(startIndex = 0){
        this.arrayStartIndex = 1 - startIndex;
    }

    setSubComponentDelimiter(delimeter){
        this.subDelimiter = delimeter;
    }

    setDelimiter(delimeter){
        this.delimiter = delimeter;
    }

    setVersion(version){
        this.version = version;
    }

    setValuesByPrimitiveData(values){
        if(typeof values === 'string'){
            let splitedData = values.split(this.delimiter);
            if(splitedData.length > 1){
                this.setValuesByArray(splitedData);
                return;
            }
        }
        if(this.primitiveIndex){
            this.setDataToIndex(this.primitiveIndex, values);
        }
        return;
    }

    setValues(values){
        if(values){
            if(Array.isArray(values)){
                this.setValuesByArray(values);
                return;
            } else if(typeof values === 'object'){
                this.setValuesByObject(values);
                return;
            } else {
                this.setValuesByPrimitiveData(values);
                return;
            }
        }
    }

    setValuesByArray(values) {
        if (values) {
            values.forEach((value, index) => {
                this.setDataToIndex(index+this.arrayStartIndex, value);
            });
        }
    }

    setDataToIndex(index, value){
        const component = this.constructor.componentsByIndex[index];
        if (component) {
            this.setComponentValue(component, value);
        }
    }

    setValuesByObject(values) {
        if (values) {
          Object.keys(values).forEach((fieldName) => {
            if(this.constructor.components[fieldName]){
                this.setComponentValue(fieldName, values[fieldName]);
            }        
          });
        }
    }


    getDataTypeInstance(component, version) {
        const componentConfig = this.constructor.components[component];
        const resolvedComponent = componentConfig.aliasOf ? componentConfig.aliasOf : component;
        const config = this.constructor.components[resolvedComponent];
        for (const dataType of config.dataTypes) {
            if (dataType.versions.includes(version)) {
                return dataType.dataType;
            }
        }
        return config.defaultDataType;
    }

    setDataTypeValue(component, value) {
        const dataType = this.getDataTypeInstance(component, this.version);
        const position = this.getComponentConfig(component)?.position;
        if(position){
            this.values[position] = dataType ? new dataType(value, {version: this.version, delimiter:
                this.subDelimiter
            }) : null;
        }
    }

    setComponentValue(component, value) {
        const dataType = this.getDataTypeInstance(component, this.version);
        if (value instanceof dataType) {
            this.values[component] = value;
        } else {
            this.setDataTypeValue(component, value);
        }
    }

    getComponentConfig(component){
        const componentConfig = this.constructor.components[component];
        if (componentConfig.aliasOf) {
            return this.getComponentConfig(componentConfig.aliasOf);
        }
        return componentConfig;
    }

    getComponent(component) {
        let componentConfig = this.getComponentConfig(component);
        if(componentConfig){
            return this.values[componentConfig.position] ?? null;
        }
        return null;
    }

    extractDataByExtractioMethod(componentValue, method = 'toJSON'){
        if(componentValue instanceof ComplexType){
            if(method === 'toArray'){
                return componentValue.toArray();
            } else {
                return componentValue.toJSON();
            }

        } else if(componentValue instanceof PrimitiveType){
            return componentValue.toString();
        } else {
            return componentValue;
        }
    }

    toJSON(){
        let componentObject = {}
        Object.keys(this.constructor.components).forEach(component =>{
            let componentValue = this.getComponent(component);
            componentObject[component] = this.extractDataByExtractioMethod(componentValue, 'toJSON');
        });
        return componentObject;
    }

    toArray(){
        let tempValues = this.values.slice(1);
        // tempValues.shift();
        return tempValues.map((value) => {
            return this.extractDataByExtractioMethod(value, 'toArray');
            
        });
    }

    toString(){
        let tempValues = this.values.slice(1);
        // tempValues.shift();
        return tempValues.map((value) => {
            return value.toString()
        }).join(this.delimiter);
    }
}