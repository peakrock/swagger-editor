import expect, { createSpy } from "expect"
import rewiremock from "rewiremock"
import Enzyme, { shallow } from "enzyme"
import Adapter from "enzyme-adapter-react-15"
import React from "react"
import FakeAce, { Session } from "test/mocks/ace.js"

const pause = (ms) => new Promise((res) => setTimeout(res, ms))

const EVENTUALLY = 900 // ms

/**
* We're mocking out the editor,
* so uses of the phrase "should see this in editor",
* will match to the following Ace methods:
*
* - "what user see's in editor" => editor.getValue()
* - "user types something" => editor.emit("change", "some value")
**/

describe.only("editor", function() {
  before(function () {
    // Enzyme.configure({ adapter: new Adapter()})
    Enzyme.configure({ adapter: new Adapter()})

    // Whole bunch of mocks!
    rewiremock.enable()
    rewiremock("brace/mode/yaml").with({})
    rewiremock("brace/theme/tomorrow_night_eighties").with({})
    rewiremock("brace/ext/language_tools").with({})
    rewiremock("brace/ext/searchbox").with({})
    rewiremock("./brace-snippets-yaml").with({})
    rewiremock("./editor.less").with({})
  })

  after(function() {
    rewiremock.disable()
  })

  beforeEach(function() {
    delete require.cache[require.resolve("react-ace")]
  })

  describe("fake ace", function() {

    it("should be an event emitter", () => {
      // Given
      const fakeAce = new FakeAce()
      const spy = createSpy()
      fakeAce.on("foo", spy)

      // When
      fakeAce.emit("foo", "bar")

      // Then
      expect(spy.calls.length).toEqual(1)
      expect(spy.calls[0].arguments[0]).toEqual("bar")
    })

    it("should return `this`, when calling .edit", function() {
      // Given
      const fakeAce = new FakeAce()

      // When
      const res = fakeAce.edit()

      // Then
      expect(res).toBe(fakeAce)
    })


    it("should keep track of setValue", function() {
      // Given
      const fakeAce = new FakeAce()

      // When
      fakeAce.setValue("foo")

      // Then
      const res = fakeAce.getValue()
      expect(res).toEqual("foo")
    })

    it("should spy on setValue", function() {
      // Given
      const fakeAce = new FakeAce()

      // When
      fakeAce.setValue("foo")

      // Then
      expect(fakeAce.setValue.calls.length).toEqual(1)
      expect(fakeAce.setValue.calls[0].arguments[0]).toEqual("foo")
    })

    it("should tie change event to setValue", function() {
      // Given
      const fakeAce = new FakeAce()

      // When
      fakeAce.emit("change", "foo")

      // Then
      const res = fakeAce.getValue()
      expect(res).toEqual("foo")
    })

    it("should return a single session, with getSession", function() {
      // Given
      const fakeAce = new FakeAce()

      // When
      const res = fakeAce.getSession()

      // Then
      expect(res).toBeA(Session)
    })

    it("should add options via setOptions", function() {
      // Given
      const fakeAce = new FakeAce()

      // When
      fakeAce.setOptions({one: "uno"})

      // Then
      const res = fakeAce.getOption("one")
      expect(res).toEqual("uno")
    })

    describe("fake session", function() {
      it("should be an event emitter", function() {
        // Given
        const fakeAce = new FakeAce()
        const fakeSession = fakeAce.getSession()
        const spy = createSpy()
        fakeSession.on("foo", spy)

        // When
        fakeSession.emit("foo", "bar")

        // Then
        expect(spy.calls.length).toEqual(1)
        expect(spy.calls[0].arguments[0]).toEqual("bar")
      })

      it("should keep add state for markers", function() {
        // Given
        const fakeAce = new FakeAce()
        const fakeSession = fakeAce.getSession()

        // When
        fakeSession.addMarker({one: 1})

        // Then
        const res = fakeSession.getMarkers()
        expect(res).toBeAn("array")
        expect(res.length).toEqual(1)
        expect(res[0]).toEqual({id: 0, one: 1})
      })

      it("should keep remove state for markers", function() {
        // Given
        const fakeAce = new FakeAce()
        const fakeSession = fakeAce.getSession()
        fakeSession.addMarker({one: 1})

        // When
        fakeSession.removeMarker(0)

        // Then
        const res = fakeSession.getMarkers()
        expect(res).toBeAn("array")
        expect(res.length).toEqual(0)
      })

      it("should spy on addMarker", function() {
        // Given
        const fakeAce = new FakeAce()
        const fakeSession = fakeAce.getSession()

        // When
        fakeSession.addMarker({one: 1})

        // Then
        expect(fakeSession.addMarker.calls.length).toEqual(1)
      })

      it("should spy on setMode", function() {
        // Given
        const fakeAce = new FakeAce()
        const fakeSession = fakeAce.getSession()

        // When
        fakeSession.setMode()

        // Then
        expect(fakeSession.setMode.calls.length).toEqual(1)
      })

      it("should have a .selection which includes toJSON, fromJSON", function() {
        // Given
        const fakeAce = new FakeAce()

        // When
        const fakeSession = fakeAce.getSession()

        // Then
        expect(fakeSession.selection).toIncludeKey("toJSON")
        expect(fakeSession.selection).toIncludeKey("fromJSON")
      })

      it.skip("should Add ctrl-z behaviour to fake ace", function() {
        // Given
        const fakeAce = new FakeAce()

        // When
        const fakeSession = fakeAce.getSession()
      })
    })

    describe("renderer", function() {
      it("should have a stub for setShowGutter", function() {
        // Given
        const fakeAce = new FakeAce()

        // When
        fakeAce.renderer.setShowGutter("foo")

        // Then
        expect(fakeAce.renderer.setShowGutter.calls.length).toEqual(1)
        expect(fakeAce.renderer.setShowGutter.calls[0].arguments[0]).toEqual("foo")
      })

    })

  })

  describe("editor component", function() {

    it("should EVENTUALLY call onChange when user enters input", (done) => {

      // Given
      const fakeAce = new FakeAce()
      rewiremock("brace").with(fakeAce)
      const makeEditor = require("plugins/editor/components/editor.jsx").default
      const Editor = makeEditor({})
      const spy = createSpy()
      const wrapper = shallow(
        <Editor onChange={spy} />
      )
      wrapper
        .find("ReactAce").shallow()

      // When
      // Simulate user input
      fakeAce.emit("change", "hello")

      // Then
      expect(fakeAce.edit.calls.length).toEqual(1)
      setTimeout(() => {
        expect(spy.calls.length).toEqual(1)
        expect(spy.calls[0].arguments[0]).toEqual("hello")
        done()
      }, EVENTUALLY)

    })

    it("should EVENTUALLY put the contents of `value` prop into editor, without regard to `origin` property", (done) => {

      // Given
      const fakeAce = new FakeAce()
      rewiremock("brace").with(fakeAce)
      const makeEditor = require("plugins/editor/components/editor.jsx").default
      const Editor = makeEditor({})

      // When
      const wrapper = shallow(
        <Editor value={"original value"} />
      )
      wrapper.find("ReactAce").shallow()

      // Then
      setTimeout(() => {
        expect(fakeAce.getValue()).toEqual("original value")
        done()
      }, EVENTUALLY)
    })

    it("should EVENTUALLY put the contents of `value` prop into editor, with `foo` origin property ", (done) => {

      // Given
      const fakeAce = new FakeAce()
      rewiremock("brace").with(fakeAce)
      const makeEditor = require("plugins/editor/components/editor.jsx").default
      const Editor = makeEditor({})

      // When
      const wrapper = shallow(
        <Editor value={"original value"} origin="foo" />
      )
      wrapper.find("ReactAce").shallow()

      // Then
      setTimeout(() => {
        expect(fakeAce.getValue()).toEqual("original value")
        done()
      }, EVENTUALLY)
    })

    it("should NEVER update ace if the yaml originated in editor", (done) => {

      // Given
      const fakeAce = new FakeAce()
      rewiremock("brace").with(fakeAce)
      const makeEditor = require("plugins/editor/components/editor.jsx").default
      const Editor = makeEditor({})

      // When
      const wrapper = shallow(
        <Editor value="original value" origin="editor" />
      )
      wrapper.find("ReactAce").shallow()

      // Then
      setTimeout(() => {
        expect(fakeAce.getValue()).toEqual("")
        done()
      }, EVENTUALLY)
    })

    // SKIPPED: Does this have any value at this level? And not editor-container?
    it.skip("should EVENTUALLY call onChange ONCE if the user types/pauses/types", async function() {
      this.timeout(10000)

      // Given
      const fakeAce = new FakeAce()
      rewiremock("brace").with(fakeAce)
      const makeEditor = require("plugins/editor/components/editor.jsx").default
      const Editor = makeEditor({})
      const spy = createSpy()
      const wrapper = shallow(
        <Editor value="original value" onChange={spy}/>
      )
      wrapper.find("ReactAce").shallow()

      // When
      fakeAce.emit("change", "one")
      await pause(EVENTUALLY / 2)
      fakeAce.emit("change", "two")
      await pause(EVENTUALLY / 2)
      fakeAce.emit("change", "three")
      await pause(EVENTUALLY / 2)

      await pause(EVENTUALLY * 2)
      expect(fakeAce.getValue()).toEqual("three")
      expect(spy.calls.length).toEqual(1)
    })

  })


  it.skip("should Add origin property to updateSpec, and default to 'not-the-editor'", function() {
    // Test in editor-container or higher
  })

  it.skip("should Test ctrl-z change propgates up (ie: calls onChange )", function() {

  })
  it.skip("should Test for redux state change ( editor-container )", function() {

  })
  it.skip("should Test for comments being disabled/enabled during a yaml update", function() {

  })
  it.skip("should Test for comments being disabled/enabled during ctrl-z", function() {

  })

})
