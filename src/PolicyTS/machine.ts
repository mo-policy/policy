// Copyright (c) Mobile Ownership, mobileownership.org.  All Rights Reserved.  See LICENSE.txt in the project root for license information.

import { rewriteApplication, matchApplication } from "./termApplication"
import { rewriteConstant, matchConstant } from "./termConstant"
import { matchFix, rewriteFix } from "./termFix"
import { rewriteFunction, matchFunction } from "./termFunction"
import { rewriteIf, matchIf } from "./termIf"
import { rewriteLet, matchLet } from "./termLet"
import { matchLetRec, rewriteLetRec } from "./termLetRec"
import { rewriteLookup, matchLookup } from "./termLookup"
import { matchMatch, rewriteMatch } from "./termMatch"
import { matchPolicy, PolicyTerm, rewritePolicy } from "./termPolicy"
import { matchReceive, rewriteReceive } from "./termReceive"
import { matchAssignment, matchDereference, matchRef, rewriteAssignment, rewriteDereference, rewriteRef } from "./termRef"
import { matchSend, rewriteSend } from "./termSend"
import { matchSequence, rewriteSequence } from "./termSequence"
import { matchTryFinally, rewriteTryFinally } from "./termTryFinally"
import { matchException, matchTryWith, rewriteException, rewriteTryWith } from "./termTryWith"


export type MatchResult = ({ readonly [k: string]: any } | false)


type ChannelMessages = {
    readonly channel: any,
    messages: 
        {
            id: number,
            message: any
        }[]    
}

type ActivePolicy = {
    machine: Machine,
    term: PolicyTerm
}


/**
 * The heart of the term rewrite system is the Machine class. Each rewrite rule
 * takes a Machine as input and returns a Machine as a result.
 * @constructor
 */
export class Machine {
    readonly term: any;
    readonly blocked: boolean;
    readonly bindings: { readonly [k: string]: any };
    readonly comm: ChannelMessages[];
    readonly policies: ActivePolicy[];
    /**
     * @param term      The current term.
     * @param blocked   The current blocked state.
     * @param bindings  The current name to value bindings.
     * @param comm      The current channels and messages.
     */
    constructor(
        term: any = null,
        blocked: boolean = false,
        bindings: { [k: string]: any } = {},
        comm: ChannelMessages[] = [],
        policies: ActivePolicy[] = []
    ) {
        this.term = term;
        this.blocked = blocked;
        this.bindings = bindings;
        this.comm = comm;
        this.policies = policies;
    }

    /**
     * Helper for immutable coding style. Creates copy of this Machine with given value overrides.
     * @param values    Values to be overwritten in the new Machine.
     * @returns         A new Machine instance with value overrides.
     */
    copyWith(values: { [k: string]: any }): Machine {
        return Object.assign(new Machine(), this, values);
    }
    /**
     * Returns the value of a bound name.
     * @param name      The name of the binding.
     * @returns         The value of the binding or unefined.
     */
    getBinding(name: string): any {
        if (name in this.bindings) {
            return this.bindings[name];
        }
        return undefined;
    }
    /**
     * Gets a rewrite function for the current term.
     * @returns     A rewrite function.
     */
    getRewriteFunction(): ((m: Machine) => Machine) {
        if ((this.term !== null) && (typeof this.term === "object")) {
            if ("$policy" in this.term) {
                switch (this.term.$policy) {
                    case "Application": return rewriteApplication;
                    case "Assignment": return rewriteAssignment;
                    case "Constant": return rewriteConstant;
                    case "Dereference": return rewriteDereference;
                    case "Exception": return rewriteException;
                    case "Fix": return rewriteFix;
                    case "Function": return rewriteFunction;
                    case "If": return rewriteIf;
                    case "Let": return rewriteLet;
                    case "LetRec": return rewriteLetRec;
                    case "Lookup": return rewriteLookup;
                    case "Match": return rewriteMatch;
                    case "Policy": return rewritePolicy;
                    case "Receive": return rewriteReceive;
                    case "Ref": return rewriteRef;
                    case "Send": return rewriteSend;
                    case "Sequence": return rewriteSequence;
                    case "TryFinally": return rewriteTryFinally;
                    case "TryWith": return rewriteTryWith;
                }
                throw "Unexpected term";
            }
        }
        return rewriteConstant;
    }
    /**
     * Gets a match function for the supplied pattern.
     * @param pattern   The pattern used to determine the match function.
     * @returns         A match function for the supplied pattern.
     */
    getMatchFunction(pattern: any): ((pattern: any, value: any) => MatchResult) {
        if ((pattern !== null) && (typeof pattern === "object")) {
            if ("$policy" in pattern) {
                switch (pattern.$policy) {
                    case "Application": return matchApplication;
                    case "Assignment": return matchAssignment;
                    case "Constant": return matchConstant;
                    case "Dereference": return matchDereference;
                    case "Exception": return matchException;
                    case "Fix": return matchFix;
                    case "Function": return matchFunction;
                    case "If": return matchIf;
                    case "Let": return matchLet;
                    case "LetRec": return matchLetRec;
                    case "Lookup": return matchLookup;
                    case "Match": return matchMatch;
                    case "Policy": return matchPolicy;
                    case "Receive": return matchReceive;
                    case "Ref": return matchRef;
                    case "Send": return matchSend;
                    case "Sequence": return matchSequence;
                    case "TryFinally": return matchTryFinally;
                    case "TryWith": return matchTryWith;
                }
                throw "Unexpected pattern";
            }
        }
        return matchConstant;
    }
    /**
     * 
     * @param message
     * @param channel
     * @returns
     */
    send(message: any, channel: any) {
        // look for channel in array
        let channelMessages: false | ChannelMessages = false;
        for (let i = 0; i < this.comm.length; i++) {
            const cm = this.comm[i];
            if (this.compare(channel, cm.channel) === 0) {
                channelMessages = cm;
                break;
            }
        }
        // if found, use that, otherwise add one and use that
        if (channelMessages === false) {
            channelMessages = {
                channel: channel,
                messages: []
            };
            this.comm.push(channelMessages);
        }
        // create an id, using Date.valueOf
        let id = (new Date()).valueOf();
        if (channelMessages.messages.length > 0) {
            const lastId = channelMessages.messages[channelMessages.messages.length - 1].id
            if (lastId >= id) {
                id = lastId + 1;
            }
        }
        // add the message to the end
        const entry = { id: id, message: message };
        channelMessages.messages.push(entry);
    }

    /**
     * 
     * @param channel   The channel of the receive term.
     * @param id        The last id to be received, or -1.
     * @returns         The next id and message on the given channel, or id = -1.
     */
    reserve(channel: any, id: number = -1): { id: number, message: any } {
        // look for channel in array
        let channelMessages: false | ChannelMessages = false;
        for (let i = 0; i < this.comm.length; i++) {
            const cm = this.comm[i];
            if (this.compare(channel, cm.channel) === 0) {
                channelMessages = cm;
                break;
            }
        }
        if (channelMessages === false) {
            return { id: -1, message: undefined };
        } else {
            // messages are sorted
            for (let msg of channelMessages.messages) {
                if (msg.id > id) {
                    return msg;
                }
            }
            return { id: -1, message: undefined };
        }
    }

    receive(channel: any, id: number): boolean {
        // look for channel in array
        let channelMessages: false | ChannelMessages = false;
        for (let i = 0; i < this.comm.length; i++) {
            const cm = this.comm[i];
            if (this.compare(channel, cm.channel) === 0) {
                channelMessages = cm;
                break;
            }
        }
        if (channelMessages !== false) {
            // look for message with id and delete it
            for (let i = 0; i < channelMessages.messages.length; i++) {
                const msg = channelMessages.messages[0];
                if (msg.id === id) {
                    channelMessages.messages.splice(i, 1);
                    return true;
                }
            }
        }
        return false;
    }

    release(channel: any, id: number): boolean {
        // look for channel in array
        let channelMessages: false | ChannelMessages = false;
        for (let i = 0; i < this.comm.length; i++) {
            const cm = this.comm[i];
            if (this.compare(channel, cm.channel) === 0) {
                channelMessages = cm;
                break;
            }
        }
        if (channelMessages !== false) {
            // look for message with id and return true
            for (let i = 0; i < channelMessages.messages.length; i++) {
                const msg = channelMessages.messages[0];
                if (msg.id === id) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Verifies if the given term is of the provided schema name.
     * @param term      The term to validate.
     * @param schema    The name of the schema.
     * @returns         True if the term validates against the schema, otherwise false.
     */
    validate(term: any, schema: string): boolean {
        return true;
    }
    /**
     * Compares two terms.
     * @param x         A term to compare.
     * @param y         A term to compare.
     * @returns         0 if x equal y, -1 if x is less than y, otherise 1.
     */
    compare(x: any, y: any): number {
        if (x === undefined || y === undefined) return -1;
        if (x === null) {
            if (y === null) return 0; else return -1;
        }
        if (typeof x === "string") {
            if (typeof y === "string") {
                if (x === y) return 0;
                if (x < y) return -1;
                return 1;
            }
            return -1;
        }
        if (typeof x === "number") {
            if (typeof y === "number") {
                if (x === y) return 0;
                if (x < y) return -1;
                return 1;
            }
            return -1;
        }
        if (typeof x === "boolean") {
            if (typeof y === "boolean") {
                if (x === y) return 0;
                if (y) return -1;
                return 1;
            }
            return -1;
        }
        if (typeof x === "bigint") {
            if (typeof y === "bigint") {
                if (x === y) return 0;
                if (x < y) return -1;
                return 1;
            }
            return -1;
        }
        if (typeof x === "object") {
            if (typeof y === "object") {
                const xlen = Object.keys(x).length
                const ylen = Object.keys(y).length
                if (xlen === ylen) {
                    for (let n in x) {
                        const cmp = this.compare(x[n], y[n]);
                        if (cmp !== 0) return cmp;
                    }
                    return 0;
                }
                if (xlen < ylen) return -1; else return 1;
            }
            return -1;
        }
        if (x === y) return 0; else return -1;
    }

}