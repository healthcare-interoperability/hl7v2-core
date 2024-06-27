import { Segment } from '@healthcare-interoperability/hl7v2-core';
import { MSH } from '@healthcare-interoperability/hl7v2-segments';

export class TriggerEvent {
    static Structure = {
        versions: {},
        segments: {},
    };

    static supportedVersions = ['2.3', '2.3.1', '2.4', '2.5', '2.5.1', '2.6', '2.7', '2.7.1', '2.8'];

    constructor(message, version = null) {
        if (message) {
            this.message = message.replace(/^\s*[\r\n]+|\s*$/g, '').trim();
            // Split the message into raw segments based on newline characters
            this.rawSegments = [];
            if (message.indexOf('\r\n') !== -1) {
              this.rawSegments = message.split('\r\n');
            } else {
              this.rawSegments = message.split('\r');
              if (this.rawSegments.length < 2) {
                this.rawSegments = message.split('\n');
              }
            }

            // Initialize an object to hold parsed segments
            this.segments = {};
            this.valid = false;
            this.errorList = [];

            if (version) {
                this.version = version;
            }

            this.zSegments = [];

            // // Check if the first segment is the MSH segment
            if (this.rawSegments[0]?.startsWith('MSH')) {
                //     // Extract delimiters from the MSH segment
                const [fieldDelimiter, componentDelimiter, repetitionDelimiter, escapeDelimiter, subComponentDelimiter] = this.rawSegments[0].substring(3, 8);
                this.delimiters = {
                    fieldDelimiter,
                    componentDelimiter,
                    repetitionDelimiter,
                    escapeDelimiter,
                    subComponentDelimiter,
                };

                // Split the MSH segment into its fields using the field delimiter
                const MSHArray = this.rawSegments[0].split(fieldDelimiter);

                // Ensure the first element is the field delimiter itself (as per HL7 standards)
                MSHArray[0] = fieldDelimiter;

                // Create an MSH segment instance (assuming an MSH class is defined elsewhere)
                this.MSHSegment = new MSH(MSHArray);
                this.version = this.MSHSegment.VersionId.toString();
                if (this.constructor.supportedVersions.includes(this.version)) {
                    this.MSHSegment.setVersion(this.version);

                    let MessageType = this.MSHSegment.MessageType;
                    this.TriggerEvent = `${MessageType.MessageCode}_${MessageType.TriggerEvent}`;

                    if (this.TriggerEvent === this.constructor.TriggerEvent) {
                        this.messageStructure = this.getStructureByVersion(this.version);
                        this.nextSequenceList = this.messageStructure.sequences.map(segmentElem => segmentElem.sequence ? this.getExpectedSequenceList(segmentElem.sequence) : [1]);
                        this.segments = this.convertHL7messageToJSON();
                        if (this.errorList.length === 0) {
                            this.valid = true;
                        }
                    } else {
                        throw new Error(`TriggerEvent Instance and Message Type are not match ${this.TriggerEvent} =/= ${this.constructor.TriggerEvent}`);
                    }
                } else {
                    throw new Error(`This version of messages are not supported !!`);
                }
            }
        }
    }

    getGroupInfo = (groupPath) => {
        let curGroupData = null;
        let pointer = this.messageStructure.groups;
        for (let groupName of groupPath) {
            curGroupData = pointer[groupName];
            pointer = curGroupData.subgroup;
        }
        return curGroupData;
    }

    getExpectedSequenceList = (previousSegmentNumber, searchForOptionalGroup = true) => {
        let previousSegmentIndex = parseInt(previousSegmentNumber);
        let nextExpectedSequenceList = new Set();
        for (let counter = previousSegmentIndex + 1; counter < this.messageStructure.sequences.length; counter++) {
            // Looping over the next segments to count all optional segments as possible next lines
            let nextSegmentData = this.messageStructure.sequences[counter];
            nextExpectedSequenceList.add(counter);
            if (!nextSegmentData.restrictions.nillable) {
                // Required section, next sections cannot appear without this
                if (nextSegmentData.isGroup) {
                    let groupMetaInfo = this.getGroupInfo(nextSegmentData.groupPath);
                    if (groupMetaInfo.restrictions.nillable) {
                        // optional group, skip to end of group in sequence
                        counter = groupMetaInfo.sequence.stop;
                    } else {
                        break;
                    }
                } else {
                    // Required section, next sections cannot appear without this
                    break;
                }
            }
        }
        // The searchForOptionalGroup flag is to avoid recursive function calls
        let curSegmentInfo = this.messageStructure.sequences[previousSegmentIndex];
        // console.log(curSegmentInfo, previousSegmentIndex);
        if (searchForOptionalGroup && curSegmentInfo.isGroup) {
            // current index is inside a group, if group is optional, 
            // that means this entire section can repeat.
            // If we were outside the group (i.e. before it has entered a group) 
            // then we are fetching the first not null element of the group either way so no further processing is needed
            // however when we are inside the group, we need to add all possible types of that group that can preceed it
            let searchIndex = this.messageStructure.sequences.length; // setting search index to something non executable
            let pointer = this.messageStructure.groups;
            for (let groupName of curSegmentInfo.groupPath) {
                let curGroupData = pointer[groupName];
                if (curGroupData.restrictions.nillable) {
                    searchIndex = curGroupData.sequence.start - 1; // so that we start searching from beinning of group
                    break;
                    // essentially, if the outer parent group is optional, then whole section is optional
                    // If outer parent is not optional, then we move to see if the inner sections are optional
                }
                pointer = curGroupData.subgroup;
            }
            let groupSegmentList = this.getExpectedSequenceList(searchIndex, false);
            groupSegmentList.forEach(elem => nextExpectedSequenceList.add(elem));
        }
        return [...nextExpectedSequenceList];
    }



    convertHL7messageToJSON = () => {
        let processedJSON = {}
        // Remove blank lines from the beginning
        let segmentArray = this.rawSegments;
        // console.log(JSON.stringify(this.messageStructure, 0, 4));
        // console.log(this.nextSequenceList);
        let expectedSequence = this.nextSequenceList[0]; // Initially only expect Header
        let previousSequence = null;
        for (let msgLine of segmentArray) {
            let expectedSegmentName = expectedSequence.map(index => this.messageStructure.sequences[index]?.identifier)
            let msgParts = msgLine.trim().split("|");
            let msgSegment = msgParts.shift();
            if (msgSegment.startsWith("Z")) {
                this.addData(processedJSON, msgSegment, {}, msgLine);
            } else {
                let foundSegmentIndex = expectedSegmentName.indexOf(msgSegment);
                if (foundSegmentIndex >= 0) {
                    // found index
                    let segmentIndex = expectedSequence[foundSegmentIndex];
                    let segmentData = this.messageStructure.sequences[segmentIndex];
                    // Add message to JSON
                    this.addData(processedJSON, msgSegment, segmentData, msgLine, previousSequence);
                    expectedSequence = this.nextSequenceList[segmentIndex];
                    if (segmentData.restrictions.maxOccurs > 1) {
                        // there can be more messages of this type
                        expectedSequence.unshift(segmentIndex);
                    }
                    previousSequence = segmentIndex; // Required for group Processing
                } else {
                    this.errorList.push(`[Error] Expected any of the following Idenfiers - ${expectedSegmentName.join()}, Found ${msgSegment}`);
                }
            }
        }
        return processedJSON;
    }

    addMessage = (msgSegment, segmentData, msgLine, destination) => {

        const [segmentIdentifier] = msgLine.trim().split(this.delimiters.fieldDelimiter);
        let segmentType = this.constructor.Structure.segments[segmentIdentifier];
        if (segmentType) {
    
          let segmentId = msgSegment + (segmentData.sequence ? "_" + segmentData.sequence : "");
          if (!destination[segmentId]) {
            destination[segmentId] = {
              isGroup: false,
              segment: msgSegment,
              sequence: segmentData.sequence,
              restrictions: segmentData.restrictions,
              messageList: []
            };
          }
    
          let segmentInstance = new segmentType(msgLine.trim(), {
            ...this.delimiters,
            version: this.version
          });
          destination[segmentId].messageList.push(segmentInstance);
        } else {
          if(segmentIdentifier.startsWith('Z')){
            this.zSegments.push(msgLine);
          } else {
            throw new Error(`Segment Type ${segmentType} not found in Segment List`);
          }
        }
      };

    addData = (processedJSON, msgSegment, segmentData, msgLine, lastProcessedSequence) => {
        if (!segmentData.isGroup) {
            this.addMessage(msgSegment, segmentData, msgLine, processedJSON);
        } else {
            // For group processing, we traverse the group path to find the appropriate placeholder in the JSON,
            // however, since a group can occur multiple times, we use the lastProcessedSequence number
            let pointer = this.messageStructure.groups;
            let jsonSourcePointer = processedJSON;
            let jsonPointer = processedJSON;
            let groupInfo = null;
            for (let groupName of segmentData.groupPath) {
                groupInfo = pointer[groupName];
                let segmentId = (groupInfo.sequence.start && groupInfo.sequence.stop) ? `${groupName}_${groupInfo.sequence.start}_${groupInfo.sequence.stop}` : groupName;
                if (!jsonPointer[segmentId]) {
                    jsonPointer[segmentId] = {
                        isGroup: true,
                        group: groupName,
                        restrictions: groupInfo.restrictions,
                        subgroup: {},
                        messageList: []
                    }
                }
                pointer = groupInfo.subgroup;
                jsonSourcePointer = jsonPointer[segmentId];
                jsonPointer = jsonPointer[segmentId].subgroup;
            }
            // to determine if this is a fresh set or not
            // Case 1 - No data currently exists for group
            // Case 2 - If last processed is beyond current group, then it is the first entry of this group, hence fresh
            // Case 3 - If current sequence is actually before previous sequence, then this is a new instance of the group
            // Case 4 - If current sequence is same previous sequence but current field has a max cardinality of 1, then it is also a new instance
            let freshdata = (jsonSourcePointer.messageList.length === 0) ? true :
                (lastProcessedSequence < groupInfo.sequence.start) ? true :
                    (lastProcessedSequence > segmentData.sequence) ? true :
                        (lastProcessedSequence === segmentData.sequence && segmentData.restrictions.maxOccurs === 1) ? true : false;

            let message = (freshdata) ? {} : jsonSourcePointer.messageList.pop();
            this.addMessage(msgSegment, segmentData, msgLine, message);
            jsonSourcePointer.messageList.push(message);
        }
    }



    getSequenceByVersion(version) {
        if (this.constructor.Structure?.versions?.[version]?.sequences) {
            let sequences = this.constructor.Structure?.versions?.[version]?.sequences;
            if (sequences?.ref) {
                return this.getSequenceByVersion(sequences?.ref);
            } else {
                return sequences;
            }
        }
    }

    getGroupByVersion(version) {
        if (this.constructor.Structure?.versions?.[version]?.groups) {
            let groups = this.constructor.Structure?.versions?.[version]?.groups;
            if (groups?.ref) {
                return this.getGroupByVersion(groups?.ref);
            } else {
                return groups;
            }
        }
    }

    getStructureByVersion(version) {
        if (this.constructor.Structure?.versions?.[version]) {
            return {
                sequences: this.getSequenceByVersion(version),
                groups: this.getGroupByVersion(version)
            }
        }
    }

    processMessageList(mode, container, messageList, invalidSegmentContainer, jsonFlag) {
        if (Array.isArray(messageList)) {
            messageList.forEach((item) => {
                if (item instanceof Segment) {
                    container.push((jsonFlag ? item.toJSON() : item))
                } else if (typeof item === 'object') {
                    let innerCont = {};
                    this.processItem(mode, innerCont, item, invalidSegmentContainer, jsonFlag);
                    container.push(innerCont);
                }
            });
        } else {
            invalidSegmentContainer.messageListError = "MessageList not an array";
        }
    }

    processValidity(messageCount, minOccurs, maxOccurs, error) {
        let validity = true;
        if (messageCount < parseInt(minOccurs)) {
            validity = false;
            error.minOccursError = {
                message: "Minimum cardinality not met",
                minOccurs: minOccurs,
                messageCount: messageCount
            };
        }
        if (messageCount > parseInt(maxOccurs)) {
            validity = false;
            error.maxOccursError = {
                message: "Maximum cardinality exceeded",
                maxOccurs: maxOccurs,
                messageCount: messageCount
            };
        }
        return validity;
    }

    processSegment(mode, container, key, segmentData, invalidSegmentContainer, jsonFlag) {
        let error = {};
        let messageErrorList = {};
        let segmentValid = this.processValidity(segmentData.messageList.length, segmentData?.restrictions?.minOccurs, segmentData?.restrictions?.maxOccurs, error);
        if (segmentValid || mode === 1) {
            if (!container[key]) {
                container[key] = [];
            }
            this.processMessageList(mode, container[key], segmentData.messageList, messageErrorList, jsonFlag);
            if (parseInt(segmentData?.restrictions?.maxOccurs) === 1 && container[key].length === 1) {
                container[key] = container[key][0];
            }
        } else {
            error.messageList = [];
            this.processMessageList(mode, error.messageList, segmentData.messageList, messageErrorList, jsonFlag);
        }
        if (Object.keys(error).length || Object.keys(messageErrorList).length) {
            invalidSegmentContainer[key] = {
                error: error,
                messageErrorList: messageErrorList
            };
        }
        this.valid = segmentValid && this.valid;
    }

    processItem(mode, container, items, invalidSegmentData, jsonFlag) {
        for (let itemKey in items) {
            let segmentData = items[itemKey];
            if (segmentData.segment === 'MSH') {
                container['MSH'] = jsonFlag ? this.MSHSegment.toJSON() : this.MSHSegment;
            } else if (!segmentData.isGroup) {
                this.processSegment(mode, container, segmentData.segment, segmentData, invalidSegmentData, jsonFlag);
            } else {
                this.processSegment(mode, container, segmentData.group, segmentData, invalidSegmentData, jsonFlag);
                if (Object.keys(segmentData.subgroup)) {
                    if (!container[segmentData.group]) {
                        container[segmentData.group] = {};
                    }
                    let groupError = {};
                    this.processItem(mode, container[segmentData.group], segmentData.subgroup, groupError, jsonFlag);
                    if (Object.keys(groupError).length) {
                        invalidSegmentData[segmentData.group] = { ...(invalidSegmentData[segmentData.group] ?? {}), ...groupError };
                    }
                }
            }
        }
    }

    toJSON(mode = 0, flag = true) {
        /**
         * mode - 0 - validated - only outputs valid sections
         *      - 1 - all - outputs all sections as found in message
         *
         * flag - true - return json
         *      - false - return class instance of segments
         */
        let data = {};
        this.valid = true;
        let invalidSegmentData = {};
        this.processItem(mode, data, this.segments, invalidSegmentData, flag);
        return data;
    }
}

