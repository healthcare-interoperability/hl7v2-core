export class PrimitiveType{
    constructor(value) {
        this.value = value;
    }

    toString(){
        return this.value;
    }

    toJSON(){
        return this.value;
    }
}