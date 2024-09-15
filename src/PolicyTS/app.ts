// Copyright (c) Mobile Ownership, mobileownership.org.  All Rights Reserved.  See LICENSE.txt in the project root for license information.

import { Machine } from "./machine"
import { rewriteTerm } from "./term"
function passOrThrow(condition: boolean): asserts condition {
    if (!condition) {
        throw "Test failed"
    }
}

const dev = false;

if (dev) {
    // Run the test under development.
    develop();
} else {
    // Run all the tests.
    testLet();
    testLookupBlocked();
    testLookupSuccess();
    testConstantWrappedConstant();
    testConstantTerm1();
    testConstantArray();
    testConstantObjectOneProperty();
    testConstantEmptyObject();
    testConstantNull();
}
 
function develop() {
}

function testLet() {
    // let x = 1 in 2
    const term = {
        $policy: "Let",
        binding: {
            $policy: "PatternBinding",
            pattern: { $policy: "Lookup", name: "x" },
            term: 1
        },
        in: 2
    };
    const m = new Machine(term);
    const r = rewriteTerm(m);
    passOrThrow(("x" in r.bindings) && (r.bindings.x === 1) && (Object.keys(r.bindings).length === 1));
    passOrThrow(r.term === 2);
}

function testLookupBlocked() {
    const term = { $policy: "Lookup", name: "x" };
    const m = new Machine(term);
    const r = rewriteTerm(m);
    passOrThrow(r.blocked === true);
    passOrThrow(r.term === term);
}

function testLookupSuccess() {
    const term = { $policy: "Lookup", name: "x" };
    const bindings: { [k: string]: any } = {
        "x": 1
    }
    const m = new Machine(term, false, bindings);
    const r = rewriteTerm(m);
    passOrThrow(r.term === 1);
    passOrThrow(r.bindings === bindings);
}

function testConstantWrappedConstant() {
    const term = { $policy: "Constant", value: { $policy: "Constant", value: 1 } };
    const m = new Machine(term);
    const r = rewriteTerm(m);
    const mjs = JSON.stringify(m);
    const rjs = JSON.stringify(r);
    passOrThrow(mjs === rjs);
}
function testConstantTerm1() {
    const term = { $policy: "Constant", value: 1 };
    const m = new Machine(term);
    const r = rewriteTerm(m);
    const mjs = JSON.stringify(m);
    const rjs = JSON.stringify(r);
    passOrThrow(mjs === rjs);
}
function testConstantArray() {
    const m = new Machine([1, true]);
    const r = rewriteTerm(m);
    const mjs = JSON.stringify(m);
    const rjs = JSON.stringify(r);
    passOrThrow(mjs === rjs);
}
function testConstantObjectOneProperty() {
    const m = new Machine({ x: 1 });
    const r = rewriteTerm(m);
    const mjs = JSON.stringify(m);
    const rjs = JSON.stringify(r);
    passOrThrow(mjs === rjs);
}
function testConstantEmptyObject() {
    const m = new Machine({});
    const r = rewriteTerm(m);
    const mjs = JSON.stringify(m);
    const rjs = JSON.stringify(r);
    passOrThrow(mjs === rjs);
}
function testConstantNull() {
    const m = new Machine(null);
    const r = rewriteTerm(m);
    const mjs = JSON.stringify(m);
    const rjs = JSON.stringify(r);
    passOrThrow(mjs === rjs);
}