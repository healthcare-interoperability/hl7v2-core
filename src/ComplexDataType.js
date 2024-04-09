import { ComplexType } from "./ComplexType";

export class ComplexDataType extends ComplexType{
    constructor(values, configs, isSubComponent = false){
        super([], configs, isSubComponent);
        this.setVersion(configs?.version ?? process.env.HL7v2Version ?? '2.5.1');
        this.setDelimiter(configs?.delimiter ?? process.env.componentDelimiter ?? '^');
        if(!isSubComponent){
            this.setSubComponentDelimiter(configs?.subDelimiter ?? process.env.subComponentDelimiter ?? '&');
        }
        this.primitiveIndex = 1;
        this.setValues(values);
    }

}