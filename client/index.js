import {
  GLOBALS, CodeBlock, Split, Alert, Radio, ButtonGroup, SubmenuItem, ColorInput, ListGroupItem, Progressbar, IFrame, Accordion, AccordionItem, Column, Row, Icon, DisplayHeading, Text, DropdownItem, DropdownLink, Navbar, App, Modal, Markdown, RichText,
  Form, Label, NavLink, InputGroup, Input, Button, InputInvalidFeedback, Image, FormText, Checkbox, Spinner, Carousel, CarouselItem, Heading, Offcanvas,
  ListGroup, Widget, Collapse, Divider, SelectionBox, SelectionItem, Stretch, DropdownDivider, Badge, Link, DropdownButton, Span, Video, RadioButton,
} from "instantui";
import { State, StateGroup } from "statesio";

/*********************************************** 
 * 
 *            UI COMPONENTS
 * 
 ***********************************************/

class AppUI extends App {
  constructor() {
    super();
    this.setStyle("background-color", bgShades[0]).setStyle("color", textShades[0]).addChildren(
      new AlertPopup().expose("alertPopup", this),
      new ProgressModal().expose("progressModal", this),
      new ConfirmationModal().expose("confirmationModal", this),
      new EditLlamaAssistantModal().expose("editLlamaAssistantModal", this),
      new EditOpenaiAssistantModal().expose("editOpenaiAssistantModal", this),
      new SettingsModal().expose("settingsModal", this),
      new Offcanvas().expose("offcanvas", this).setStyle("background-color", bgShades[0]).setTextColor("light")
        .setHeaderContent(
          new Button().setButtonSize("sm").setContent(new Icon("x")).addSpacing("ms-auto")
            .onClick(() => this.offcanvas.toggle())
        )
        .addChildren(
          new Column().expose("assistantPanelOffcanvas", this).addSpacing("p-4").setOverflow("auto").addChildren(
          )
        ),
      new Row().addSpacing("p-4").addChildren(
        new Column().setMaxWidth(400).addSpacing("p-3").display(0).display(1, breakPoint).addChildren(
          new Column().expose("assistantPanelCanvas", this).setOverflow("hidden").setStyle("background-color", bgShades[1]).addSpacing("p-4").setRound(5).addChild(
            new AssistantPanel().expose("assistantPanel", this).setActive(0)
          )
        ),
        new Column().justifyItems("center").addSpacing("p-3").setPositioning("relative").addChildren(
          new Logo().setPositioning("absolute").setZIndex(1000),
          new Column().justifyItems("start").setGap(10).setPositioning("relative").addChildren(
            new Row().stretchY("none").setZIndex(1003).addChildren(
              new Row().setStyle("background-color", bgShades[1]).setRound(3).addSpacing("p-2").addChildren(
                new Button().display(1).display(0, breakPoint).setContent(new Icon("list")).onClick(() => this.offcanvas.toggle()),
                new Row().stretch("none", "none").setGap(10).addSpacing("m-auto").addChildren(
                  new Icon("robot").setFontSize(1.4, "em"),
                  new Label().expose("chatTitle", this).setFontSize(.9, "em").setFontWeight("bold")
                ),
                new Row().expose("chatButtonsGroup", this).hide().stretch("none", "none").setGap(10).addChildren(
                  new Button().setButtonSize("sm").setContent(new Icon("stars")).onClick(onNewChatButtonClick),
                  new DropdownButton().expose("historyButton", this).hide().setButtonSize("sm").setColor("primary").hideArrow().setContent(new Icon("clock-history")).addChildren(
                    new Column().setGap(10).addChildren(
                      new Column().expose("historyContainer", this).setMaxSize(300, 300).setOverflow("auto"),
                      new Link("Clear History").onClick((self, e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        app.confirmationModal.open("Clear History", "Are you sure you want to clear the history?", () => {
                          onClearHistoryButtonClick()
                        })
                      })
                    )
                  )
                )
              ),
            ),
            new Column().expose("chatPanel", this).hide().setOverflow("hidden").addChildren(
              new Column().stretchX("none").setGap(20).setZIndex(1001).snapToBreakpoints(1).addChildren(
                new Column().setGap(20).setOverflow("hidden").addChildren(
                  new Column().expose("chatContainer", this).setGap(20).justifyItems("start").setOverflow("auto")
                ),
                new Row().stretchY("none").justifyItems("center").setGap(20).setPositioning("relative").addChildren(
                  new Button().expose("sendButton", this).setContent(new Icon("send")).setPositioning("absolute").onClick(onSendButtonClick).setPosition({ right: 1, bottom: .5 }, "rem").apply(self => {
                    self.setBusy = (val = true) => {
                      if (val) {
                        self.onClick(onAbortResponseClick).getChild(0).setIcon("stop");
                      }
                      else {
                        self.onClick(onSendButtonClick).getChild(0).setIcon("send");
                      }
                      return this
                    };
                  }),
                  new Input("textarea").expose("userInput", this).addSpacing("p-3").setAutocapitalize("off").setPlaceholder("Type a message...").setStyle("resize", "none").setStyle("overflow-y", "auto").setAttribute("rows", "1").onInput((val, self) => {
                    self.setAttribute("rows", `${Math.min(val.split('\n').length, 5)}`);
                  }).addEventListener("keydown", (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      this.sendButton.click();
                    }
                  }),
                )
              ),
              new Column().expose("chatPanelBusy", this).setPositioning("absolute").justifyItems("center").setZIndex(1002).addChildren(
                new Column().setPositioning("absolute").setStyle("background-color", bgShades[0]).setOpacity(.76),
                new Row().stretch("none", "none").setPositioning("absolute").setStyle("background-color", bgShades[2]).setStyle("color", accentShades[0]).setRound(4).setGap(20).addSpacing("p-3", "mt-5").addChildren(
                  new Spinner().expose("chatPanelBusySpinner", this),
                  new Text().expose("chatPanelBusyText", this).setFontSize(1.3, "rem")
                )
              ),
            ).apply(self => {
              self.busy = () => {
                this.chatButtonsGroup.hide()
                this.chatPanelBusySpinner.show();
                this.chatPanelBusyText.setText("Connecting to assistant...");
                this.chatPanelBusy.show();
              };
              self.enable = () => {
                this.chatButtonsGroup.show()
                this.chatPanelBusy.hide();
              };
              self.error = () => {
                self.busy();
                this.chatPanelBusySpinner.hide();
                this.chatPanelBusyText.setText("Not connected");
              };
            })
          )
        ),
      )
    );

    window.addEventListener("resize", e => {
      let breakPointSize;
      switch (breakPoint) {
        case "sm":
          breakPointSize = 576;
          break;
        case "md":
          breakPointSize = 768;
          break;
        case "lg":
          breakPointSize = 992;
          break;
        case "xl":
          breakPointSize = 1200;
          break;
        default:
          breakPointSize = 992;
      }

      if (window.innerWidth < breakPointSize) {
        this.assistantPanelOffcanvas.addChild(this.assistantPanel);
      }
      else {
        this.offcanvas.close();
        this.assistantPanelCanvas.addChild(this.assistantPanel);
      }
    })
  }

  addAlert(message, color = "info") {
    this.alertPopup.addAlert(message, color);
  }

  addBody(...body) {
    this.body.addChildren(...body);
    return this;
  }

  addSpacing(...spacing) {
    this.body.addSpacing(...spacing);
    return this;
  }

  clearSpacing() {
    this.body.clearSpacing();
    return this;
  }

  snapToBreakpoints(val = true) {
    this.body.snapToBreakpoints(val);
    return this;
  }

  setOverflow(overflow) {
    this.getChildren()[1].setOverflow(overflow);
    return this;
  }
}

class AssistantCard extends Column {
  constructor(assistant) {
    super();
    this.assistant = assistant;
    this.stretchY("none").setPositioning("relative").setStyle("background-color", bgShades[2]).addSpacing("p-4").setRound(4).setGap(20).setHeight(140).addChildren(
      new Row().setGap(20).alignItems("start").setCursor("pointer").addChildren(
        assistant.type === "llama" ? new Icon("robot").setFontSize(3, "em") : new Widget("svg").setWidth(4, "rem").apply(self => fetch("./images/chatgpt-icon.svg").then(async res => self.setInnerHTML(await res.text()))),
        new Column().setOverflow("hidden").setGap(4).alignItems("start").addChildren(
          new Label(assistant.name).expose("nameText", this).setFontSize(.9, "em").setFontWeight("bold"),
          new Row().setOverflow("auto").addChildren(
            new Text(assistant.description).expose("descriptionText", this).stretchY().setFontSize(.8, "em").setTextColor("muted"),
          )
        )
      ),
      new DropdownLink().expose("dropdownButton", this).setColor("light").setContent(new Icon("three-dots-vertical")).setPositioning("absolute").setPosition({ top: .5, right: .5 }, "em").addChildren(
        new DropdownItem().setContent(new Row().setGap(10).addChildren(new Icon("copy"), new Text("Duplicate"))).onClick((self, e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropdownButton.close()
          onAssistantDuplicateButtonClick(assistant)
        }),
        new DropdownItem().setContent(new Row().setGap(10).addChildren(new Icon("save"), new Text("Save to File"))).onClick((self, e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropdownButton.close()
          onAssistantSaveButtonClick(assistant)
        }),
        new DropdownItem().expose("editButton", this).hide().setContent(new Row().setGap(10).addChildren(new Icon("pencil-square"), new Text("Edit"))).onClick((self, e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropdownButton.close()
          onAssistantEditButtonClick(assistant)
        }),
        new DropdownItem().expose("deleteButton", this).hide().setContent(new Row().setGap(10).addChildren(new Icon("trash"), new Text("Delete"))
        ).onClick((self, e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropdownButton.close()
          onAssistantDeleteButtonClick(assistant)
        })
      ).onClick((self, e) => {
        e.preventDefault();
        e.stopPropagation();
      })
    ).onClick(() => {
      function getPanelIndex(panel, element) {
        let idx = panel.getChildren().indexOf(element);
        return idx >= 0 ? idx : null;
      }
      let idx = getPanelIndex(app.assistantPanel, this);
      if (idx !== null && idx !== app.assistantPanel.getActiveIdx()) {
        app.assistantPanel.setActive(idx);
        assistantState.set(assistant);
      }
    }).setEditable(assistant.editable);
  }

  setActive(val = true) {
    this.setStyle("background-color", val ? accentShades[0] : bgShades[2]);
    this.descriptionText.setTextColor(val ? "light" : "muted");
    return this;
  }

  setEditable(val = true) {
    if (val) {
      this.editButton.show()
      this.deleteButton.show()
    }
    else {
      this.editButton.hide()
      this.deleteButton.hide()
    }
    return this;
  }
}

class AssistantPanel extends Column {
  constructor() {
    super();
    super.addChildren(
      new Column().expose("asistantPanel", this).setGap(24).stretchY("none").setOverflow("auto"),
      new Row().setGap(10).stretchY("none").addSpacing("mt-auto").justifyItems("end").addSpacing("pt-3").addChildren(
        new Input("file").hide().setAttribute("accept", ".json").expose("fileInput", this).addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const assistant = JSON.parse(e.target.result);
              assistant.type === "llama" ? app.editLlamaAssistantModal.open(assistant, createAssistant) : app.editOpenaiAssistantModal.open(assistant, createAssistant);
            };
            reader.readAsText(file);
          }
          this.fileInput.setValue("");
        }),
        new DropdownButton().setColor("primary").setContent(new Icon("plus")).hideArrow().addChildren(
          new DropdownItem().setContent(new Row().setGap(10).addChildren(new Icon("robot"), new Text("Create Local Assistant"))).onClick(() => app.editLlamaAssistantModal.open(null, createAssistant)),
          new DropdownItem().setContent(new Row().setGap(10).addChildren(new Widget("svg").setWidth(1, "rem").apply(self => fetch("./images/chatgpt-icon.svg").then(async res => self.setInnerHTML(await res.text()))), new Text("Create Openai Assistant"))).onClick(() => app.editOpenaiAssistantModal.open(null, createAssistant)),
          new DropdownItem().setContent(new Row().setGap(10).addChildren(new Icon("file-earmark-code"), new Text("Create Assistant From File"))).onClick(() => this.fileInput.click()),
        ),
        new Button().setColor("secondary").setContent(new Icon("gear")).onClick(() => app.settingsModal.open())
      )
    ).setGap(10)
  }

  setActive(indexOrElement) {
    const children = this.getChildren();
    if (typeof indexOrElement === "number") {
      children.forEach((child, i) => {
        child.setActive(i === indexOrElement);
        this.activeIdx = indexOrElement;
      });
    }
    else {
      const idx = children.indexOf(indexOrElement);
      idx >= 0 && this.setActive(children.indexOf(indexOrElement));
    }
    return this;
  }

  getActiveIdx() {
    return this.activeIdx ?? -1;
  }

  getIndexOf(assistant) {
    return this.getChildren().findIndex(child => child.assistant.id === assistant.id);
  }

  addChild(assistant) {
    this.asistantPanel.addChild(assistant);
    return this;
  }

  addChildren(...assistants) {
    this.asistantPanel.addChildren(...assistants);
    return this;
  }

  insertChild(index, assistant) {
    this.asistantPanel.insertChild(index, assistant);
    return this;
  }

  removeChild(assistant) {
    this.asistantPanel.removeChild(assistant);
    return this;
  }

  getChildren() {
    return this.asistantPanel.getChildren();
  }
}

class ChatBubble extends Column {
  constructor(message, role = "user") {
    super();
    this.stretchY("none").alignItems(role === "user" ? "end" : "start").addChildren(
      new Column().stretch("none", "none").setStyle("background-color", role === "user" ? accentShades[0] : bgShades[1]).setRound(3).addSpacing("px-3").addChildren(
        new Markdown(message).expose("textInput", this).setStyle("color", textShades[role === "user" ? 0 : 1]),
      )
    );
  }

  setText(message) {
    this.textInput.setText(message);
    return this;
  }
}

class DirectoryInput extends Column {
  constructor(label, name, path, required = false) {
    super();
    this.alignItems("start").addChildren(
      new Label(`${label}:`).addSpacing("ms-1"),
      new InputGroup().expose("inputGroup", this).addChildren(
        new Input("text").expose("input", this).setName(name).setPlaceholder("Directory Path").setValue(path).required(required),
        new Button().setColor("secondary").setOutlined().setContent(new Icon("folder")).onClick(async () => {
          window.electronAPI.selectFolder().then((path) => {
            this.input.setValue(path);
          })
        }),
      )
    );
  }

  setValue(val) {
    this.input.setValue(val);
    return this;
  }

  getValue() {
    return this.input.getValue();
  }

}

class FormInput extends Column {
  constructor(label, type = "text", name = "", placeholder = "", required = false) {
    super();
    this.alignItems("start").addChildren(
      new Label(`${label}:`).addSpacing("ms-1"),
      new InputGroup().expose("inputGroup", this).addChildren(
        new Input(type).expose("input", this).setName(name).setPlaceholder(placeholder).required(required)
      )
    );
  }

  setValidation(regex, message) {
    this.input.setCustomValidation(val => regex.test(val) || message)
    return this;
  }

  setValue(val) {
    this.input.setValue(val);
    return this;
  }

  setAttribute(attr, val) {
    this.input.setAttribute(attr, val);
    return this;
  }
}

class FormSelectionBox extends Column {
  constructor(label, name, items, activeIdx, required = false) {
    super();
    this.alignItems("start").addChildren(
      new Label(`${label}:`).addSpacing("ms-1"),
      new InputGroup().expose("inputGroup", this).addChildren(
        new SelectionBox().expose("selectionBox", this).addChild(
          new SelectionItem("None", "")
        ).onChange((val, idx, item) => {
          this.input.setValue(val);
        }),
      ),
      new Input("hidden").expose("input", this).setName(name).required(required),
    )

    for (let item of items) {
      this.selectionBox.addChild(
        new SelectionItem(item, item)
      )
    }

    this.selectionBox.setSelected(activeIdx == null ? 0 : activeIdx + 1);
    this.input.setValue(activeIdx == null ? "" : items[activeIdx]);
  }

  setItems(items, idx) {
    this.selectionBox.clearChildren().addChild(new SelectionItem("None", ""));
    for (let item of items) {
      this.selectionBox.addChild(
        new SelectionItem(item, item)
      )
    }
    this.selectionBox.setSelected(idx == null ? 0 : idx + 1);
    this.input.setValue(idx == null ? "" : items[idx]);
  }
}

class HistoryItem extends DropdownItem {
  constructor(history) {
    super();
    this.stretchX().setContent(
      new Column().setOverflow("hidden").addChildren(
        new Row().stretchY("none").setGap(10).addChildren(
          new Text(history.title).setOverflow("hidden"),
          new Button().setButtonSize("sm").setColor("light").addSpacing("ms-auto").setContent(new Icon("trash")).onClick((btn, e) => {
            e.preventDefault();
            e.stopPropagation();
            app.confirmationModal.open("Delete History", "Are you sure you want to delete this history?", () => {
              onHistoryDeleteButtonClick(history.id).then(() => {
                this.getParent().removeChild(this);
              })
            })
          })
        ),
        new Row().stretchY("none").setGap(10).addChildren(
          new Text(getElapsedTime(history.meta.updated || history.meta.created)).fontItalic(1).setFontSize(.8, "em").setTextColor("muted").setText("Today"),
        )
      ).onClick(() => chatState.set(history))
    );
  }
}

class Logo extends Row {
  constructor() {
    super();
    this.stretch("none", "none").setOrigin("center").setGap(6).alignItems("baseline").setFontSize(4, "em").setOpacity(.1)
      .addChildren(
        new Icon("robot").setStyle("color", accentShades[0]),
        new Text("KodiBot").setFontWeight("bold").setStyle("color", accentShades[0])
      );
  }
}

class ModelInput extends FormSelectionBox {
  constructor(items = [], activeIdx) {
    super("Model File", "modelFile", items, activeIdx);
    this.inputGroup.addChildren(
      new Button().setColor("secondary").setOutlined().setContent(new Icon("plus")).onClick(() => this.fileInput.click()),
      new Button().setColor("secondary").setOutlined().setContent(new Icon("trash").setTextColor("danger")).onClick(() => {
        this.addChild(new Input("hidden").setName("removedModels[]").setValue(this.selectionBox.getValue()));
        this.selectionBox.removeChildAt(this.selectionBox.getSelectedIndex());
        this.selectionBox.setSelected(0);
        this.input.setValue("");
      })
    )
    this.addChildren(
      new Input("file").hide().removeAttribute("name").expose("fileInput", this).setAttribute("multiple", "false").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          this.addChild(new Input("hidden").setName("newModels[]").setValue(file.path));
          this.selectionBox.addChild(new SelectionItem(file.name, file.name));
          this.selectionBox.setSelected(this.selectionBox.getChildren().length);
          this.input.setValue(file.name);
        }
      })
    )
  }
}

class OpenaiApiKeyInput extends FormInput {
  constructor(callback) {
    super("Api Key", "text", "api_key", "Api Key");
    this.callback = callback;
    this.inputGroup.addChildren(
      new Button().setColor("secondary").setOutlined().setContent(new Icon("arrow-repeat")).onClick(() => {
        this.callback && this.callback(this.input.getValue());
      }),
    )
  }

  setRefreshCallback(callback) {
    this.callback = callback;
    return this;
  }
}

/*********************************************** 
 * 
 *            UI MODALS
 * 
 ***********************************************/

class AlertPopup extends Column {
  constructor() {
    super();
    this.stretch("none", "none")
      .alignItems("end")
      .setPositioning("absolute")
      .setPosition({ bottom: 0, right: "1em" })
      .setZIndex(1100);
  }

  addAlert(message, color = "info") {
    let alert = new Alert(message, color).setMaxWidth(500);
    this.addChild(alert);
    setTimeout(() => {
      alert.close();
    }, 9000);
  }
}

class ConfirmationModal extends Modal {
  constructor() {
    super();
    this.setModalSize("lg")
      .setCentered()
      .staticBackdrop()
      .scrollable()
      .setTextColor("dark");
    // get body 
    this.getChild(0).getChild(0).getChild(1).addSpacing("px-3", "px-sm-5");

    this.setHeaderContent(
      new Row().addSpacing("p-3").alignItems("center").setGap(8).addChildren(
        new Icon("exclamation-triangle").expose("icon", this).setFontSize(20).scale(-1, 1),
        new Label("Confirmation").expose("label", this)
      )
    );
    this.setBodyContent(new Row().addSpacing("p-3").addChildren(new Markdown().expose("text", this).addSpacing("my-3")));
    this.setFooterContent(new Row().justifyItems("end").addSpacing("p-2").setGap(20).addChildren(
      new Button("Close").setColor("secondary").onClick(() => {
        this.accept = false;
        this.close();
      }),
      new Button("Confirm").expose("confirmButton", this).onClick(() => {
        this.accept = true;
        this.close();
      })
    ));

    this.onHidden(() => {
      if (this.accept) {
        this.resolve && this.resolve();
      } else {
        this.reject && this.reject();
      }
    });

  }

  open(label, message, resolve, reject, buttonName = "Confirm", color = "primary") {
    this.icon.setTextColor(color);
    this.text.setText(message);
    this.label.setText(label);
    this.resolve = resolve;
    this.reject = reject;
    this.confirmButton.setColor(color).setText(buttonName);
    super.open();
  }
}

class EditLlamaAssistantModal extends Modal {
  constructor() {
    super();
    this.setModalSize("lg")
      .setCentered()
      .scrollable()
      .staticBackdrop()
      .setTextColor("dark");
    // get body 
    this.getChild(0).getChild(0).getChild(1).addSpacing("px-3", "px-sm-5");

    this.setHeaderContent(
      new Row().addSpacing("p-3").alignItems("center").setGap(8).addChildren(
        new Icon("pencil-square").setFontSize(20).scale(-1, 1),
        new Label("Edit Assistant").expose("label", this)
      )
    );
    this.setBodyContent(new Row().justifyItems("center").addSpacing("p-3").addChildren(
      new Form().expose("form", this).stretchX().setMaxWidth(500).addChildren(
        new Column().setGap(16).addChildren(
          new FormInput("Name", "text", "name", "Assistant name", true).expose("name", this).setValidation(/^[a-zA-Z0-9-_ ]{3,60}$/, "Name must be between 3 and 60 characters long."),
          new FormInput("Description", "textarea", "description", "Assistant description").expose("description", this).setValidation(/^.{0,10000}$/, "Description must be less than 10000 characters long.").setAttribute("rows", "4"),
          new FormInput("System Prompt", "textarea", "systemPrompt", "System Prompt").expose("systemPrompt", this).setAttribute("rows", "4"),
          new Accordion().addChildren(
            new AccordionItem("Advanced Settings", "").setBodyContent(new Column().setGap(10).addSpacing("p-3").addChildren(
              new ModelInput().expose("modelFileSelectionBox", this),
              new FormInput("Prompt Template", "textarea", "promptTemplate", "Prompt Template").expose("promptTemplate", this).setAttribute("rows", "4"),
              new FormInput("History Template", "textarea", "historyTemplate", "Prompt Template").expose("historyTemplate", this).setAttribute("rows", "2"),
              new FormInput("Stop Template", "text", "stopTemplate", "Stop Template").expose("stopTemplate", this),
              new FormInput("Api Url", "text", "api_url", "Api Url", true).expose("api_url", this),
              new FormInput("Api Key", "text", "api_key", "Api Key").expose("api_key", this),
              new FormInput("Predictions", "text", "n_predict", "Predictions", true).expose("n_predict", this),
              new FormInput("Temperature", "text", "temperature", "Temperature", true).expose("temperature", this),
              new FormInput("Penalize repeat sequence", "text", "repeat_penalty", "Penalize repeat sequence", true).expose("repeat_penalty", this),
              new FormInput("Consider N tokens for penalize", "text", "repeat_last_n", "Consider N tokens for penalize", true).expose("repeat_last_n", this),
              new FormInput("Top-K sampling", "text", "top_k", "Top-K sampling", true).expose("top_k", this),
              new FormInput("Top-P sampling", "text", "top_p", "Top-P sampling", true).expose("top_p", this),
              new FormInput("Min-P sampling", "text", "min_p", "Min-P sampling", true).expose("min_p", this),
              new FormInput("TFS-Z", "text", "tfs_z", "TFS-Z", true).expose("tfs_z", this),
              new FormInput("Typical P", "text", "typical_p", "Typical P", true).expose("typical_p", this),
              new FormInput("Presence penalty", "text", "presence_penalty", "Presence penalty", true).expose("presence_penalty", this),
              new FormInput("Frequency Penalty", "text", "frequency_penalty", "Frequency Penalty", true).expose("frequency_penalty", this),
              new FormInput("Mirostat", "text", "mirostat", "Mirostat", true).expose("mirostat", this),
              new FormInput("Mirostat tau", "text", "mirostat_tau", "Mirostat tau", true).expose("mirostat_tau", this),
              new FormInput("Mirostat eta", "text", "mirostat_eta", "Mirostat eta", true).expose("mirostat_eta", this),
              new FormInput("Show Probabilities", "text", "n_probs", "Show Probabilities", true).expose("n_probs", this),
              new FormInput("Min Probabilities from each Sampler", "text", "min_keep", "Min Probabilities from each Sampler", true).expose("min_keep", this),
            ))
          )
        )
      )
    ));
    this.setFooterContent(new Row().justifyItems("end").addSpacing("p-2").setGap(20).addChildren(
      new Button("Close").setColor("secondary").onClick(() => {
        this.close();
      }),
      new Button("Save").onClick(() => {
        if (!this.form.validate()) return;

        const newAssistant = {}
        const formData = this.form.getFormData();
        for (var pair of formData.entries()) {
          if (pair[0].endsWith("[]" || !newAssistant[pair[0]])) {
            newAssistant[pair[0].replace("[]", "")] = formData.getAll(pair[0]);
          }
          else {
            newAssistant[pair[0]] = pair[1];
          }
        }
        newAssistant.id = this.assistant?.id;
        newAssistant.type = "llama";
        this.form.disable();
        this.callback && this.callback(newAssistant).then(() => {
          this.close();
        }).catch(err => {
          this.form.enable()
        })
      })
    ));
  }

  open(assistant, callback) {
    this.label.setText(assistant ? "Edit Assistant" : "Create Assistant");
    this.callback = callback;
    this.assistant = assistant;
    this.form.enable().clearValidation();
    this.name.setValue(assistant?.name ?? "");
    this.description.setValue(assistant?.description ?? "");
    this.systemPrompt.setValue(assistant?.systemPrompt ?? "");
    this.promptTemplate.setValue(assistant?.promptTemplate ?? "{{system-prompt}}\n{{history}}\n{{user-name}}: {{prompt}}\n{{assistant-name}}:");
    this.historyTemplate.setValue(assistant?.historyTemplate ?? "{{user-name}}: {{user-prompt}}\n{{assistant-name}}: {{assistant-prompt}}");
    this.stopTemplate.setValue(assistant?.stopTemplate ?? ["</s>", "{{user-name}}:", "{{assistant-name}}:"]);
    this.api_url.setValue(assistant?.params.api_url ?? "http://127.0.0.1:11465");
    this.api_key.setValue(assistant?.params.api_key ?? "");
    this.n_predict.setValue(assistant?.params.n_predict ?? "400");
    this.temperature.setValue(assistant?.params.temperature ?? "0.7");
    this.repeat_penalty.setValue(assistant?.params.repeat_penalty ?? "1.18");
    this.repeat_last_n.setValue(assistant?.params.repeat_last_n ?? "256");
    this.top_k.setValue(assistant?.params.top_k ?? "40");
    this.top_p.setValue(assistant?.params.top_p ?? "0.95");
    this.min_p.setValue(assistant?.params.min_p ?? "0.05");
    this.tfs_z.setValue(assistant?.params.tfs_z ?? "1");
    this.typical_p.setValue(assistant?.params.typical_p ?? "1");
    this.presence_penalty.setValue(assistant?.params.presence_penalty ?? "0");
    this.frequency_penalty.setValue(assistant?.params.frequency_penalty ?? "0");
    this.mirostat.setValue(assistant?.params.mirostat ?? "0");
    this.mirostat_tau.setValue(assistant?.params.mirostat_tau ?? "5");
    this.mirostat_eta.setValue(assistant?.params.mirostat_eta ?? "0.1");
    this.n_probs.setValue(assistant?.params.n_probs ?? "0");
    this.min_keep.setValue(assistant?.params.min_keep ?? "0");
    window.electronAPI.getModels().then(models => {
      if (models.length) {
        const idx = models.indexOf(assistant?.modelFile ?? "luna-ai-llama2-uncensored.Q4_K_M.gguf");
        this.modelFileSelectionBox.setItems(models, idx)
      }
      else {
        this.modelFileSelectionBox.setItems([], 0)
      }
    });
    super.open();
  }
}

class EditOpenaiAssistantModal extends Modal {
  constructor() {
    super();
    this.setModalSize("lg")
      .setCentered()
      .scrollable()
      .staticBackdrop()
      .setTextColor("dark");
    // get body 
    this.getChild(0).getChild(0).getChild(1).addSpacing("px-3", "px-sm-5");

    this.setHeaderContent(
      new Row().addSpacing("p-3").alignItems("center").setGap(8).addChildren(
        new Icon("pencil-square").setFontSize(20).scale(-1, 1),
        new Label("Edit Assistant").expose("label", this)
      )
    );
    this.setBodyContent(new Row().justifyItems("center").addSpacing("p-3").addChildren(
      new Form().expose("form", this).stretchX().setMaxWidth(500).addChildren(
        new Column().setGap(16).addChildren(
          new FormInput("Name", "text", "name", "Assistant name", true).expose("name", this).setValidation(/^[a-zA-Z0-9-_ ]{3,60}$/, "Name must be between 3 and 60 characters long."),
          new FormInput("Description", "textarea", "description", "Assistant description").expose("description", this).setValidation(/^.{0,10000}$/, "Description must be less than 10000 characters long.").setAttribute("rows", "4"),
          new OpenaiApiKeyInput().expose("api_key", this),
          new FormSelectionBox("Model", "modelFile", []).expose("modelFileSelectionBox", this),
          new FormInput("System Prompt", "textarea", "systemPrompt", "System Prompt").expose("systemPrompt", this).setAttribute("rows", "4"),
          new Accordion().addChildren(
            new AccordionItem("Advanced Settings", "", false).setBodyContent(new Column().setGap(10).addSpacing("p-3").addChildren(
              new FormInput("Api Url", "text", "api_url", "Api Url", true).expose("api_url", this),
              new FormInput("Stop Template", "text", "stopTemplate", "Stop Template").expose("stopTemplate", this),
              new FormInput("Maximum Tokens", "text", "max_tokens", "Maximum Tokens", true).expose("max_tokens", this),
              new FormInput("Temperature", "text", "temperature", "Temperature", true).expose("temperature", this),
              new FormInput("Top-P sampling", "text", "top_p", "Top-P sampling", true).expose("top_p", this),
              new FormInput("Frequency Penalty", "text", "frequency_penalty", "Frequency Penalty", true).expose("frequency_penalty", this),
              new FormInput("Presence penalty", "text", "presence_penalty", "Presence penalty", true).expose("presence_penalty", this)
            ))
          )
        )
      )
    ));
    this.setFooterContent(new Row().justifyItems("end").addSpacing("p-2").setGap(20).addChildren(
      new Button("Close").setColor("secondary").onClick(() => {
        this.close();
      }),
      new Button("Save").onClick(() => {
        if (!this.form.validate()) return;

        const newAssistant = {}
        const formData = this.form.getFormData();
        for (var pair of formData.entries()) {
          if (pair[0].endsWith("[]" || !newAssistant[pair[0]])) {
            newAssistant[pair[0].replace("[]", "")] = formData.getAll(pair[0]);
          }
          else {
            newAssistant[pair[0]] = pair[1];
          }
        }
        newAssistant.id = this.assistant?.id;
        newAssistant.type = "openai";
        this.form.disable();
        this.callback && this.callback(newAssistant).then(newAssistant => {
          this.close();
        }).catch(err => {
          this.form.enable()
        })
      })
    ));

    this.api_key.setRefreshCallback((api_key) => {
      this.form.disable();
      window.electronAPI.getOpenaiModels(api_key).then(models => {
        app.addAlert("API Key validated", "success");
        if (models.length) {
          const idx = models.indexOf(this.assistant ? this.assistant.modelFile : "gpt-4")
          this.modelFileSelectionBox.setItems(models, idx)
        }
        this.form.enable()
      }).catch(() => {
        this.form.enable()
        app.addAlert("Invalid API Key", "warning");
      });
    })
  }

  open(assistant, callback) {
    this.label.setText(assistant ? "Edit Assistant" : "Create Assistant");
    this.assistant = assistant;
    this.callback = callback;
    this.form.enable().clearValidation();
    this.name.setValue(assistant?.name ?? "");
    this.description.setValue(assistant?.description ?? "");
    this.systemPrompt.setValue(assistant?.systemPrompt ?? "");
    this.stopTemplate.setValue(assistant?.stopTemplate ?? "");
    this.api_url.setValue(assistant?.params.api_url ?? "https://api.openai.com/v1/chat/completions");
    this.api_key.setValue(assistant?.params.api_key ?? "");
    this.max_tokens.setValue(assistant?.params.max_tokens ?? "600");
    this.temperature.setValue(assistant?.params.temperature ?? "0.7");
    this.top_p.setValue(assistant?.params.top_p ?? "0.85");
    this.presence_penalty.setValue(assistant?.params.presence_penalty ?? "0");
    this.frequency_penalty.setValue(assistant?.params.frequency_penalty ?? "1.18");
    if (assistant) {
      window.electronAPI.getOpenaiModels(assistant.params.api_key).then(models => {
        if(models.length){
          const idx = models.indexOf(assistant.modelFile);
          this.modelFileSelectionBox.setItems(models, idx)
        }
      }).catch(() => { });
    }
    else {
      this.modelFileSelectionBox.setItems(["gpt-3", "gpt-4"], 1)
    }
    super.open();
  }
}

class ProgressModal extends Modal {
  constructor() {
    super();

    this.setModalSize("lg")
      .scrollable()
      .staticBackdrop()
      .setCentered();

    this.setHeaderContent(
      new Row().addSpacing("p-3").alignItems("center").setGap(8).setTextColor("dark").addChildren(
        new Icon("cloud-download").expose("icon", this).setFontSize(20).scale(-1, 1),
        new Label("Downloading AI Model")
      )
    );
    this.setBodyContent(
      new Column().addSpacing("p-1").addChildren(
        new Progressbar().expose("progressBar", this).setHeight(20).setColor("primary").striped().animated(),
        new Text().expose("progressLabel", this).setTextColor("muted").setFontSize(.8, "em").setText("0%")
      ));
    this.setFooterContent(new Row().justifyItems("end").addSpacing("p-2").setGap(20).addChildren(
      new Button("Cancel").setWidth(80).setColor("secondary").onClick(() => {
        this.cancelCallback && this.cancelCallback();
        this.close();
      })
    ));

    this.onHidden(() => {
      this.progressBar.setProgress(0).setLabel("0%");
    });
  }

  open(cancelCallback = null) {
    this.cancelCallback = cancelCallback;
    super.open();
  }

  setProgress(progress) {
    this.progressBar.setProgress(progress.percent).setLabel(`${progress.percent}%`);
    const loadedMb = (progress.loaded / 1024 / 1024).toFixed(2);
    const totalMb = (progress.total / 1024 / 1024).toFixed(2);

    this.progressLabel.setText(`${loadedMb}MB of ${totalMb}MB downloaded`);
  }
}

class SettingsModal extends Modal {
  constructor() {
    super();
    this.setModalSize("lg")
      .setCentered()
      .scrollable()
      .staticBackdrop()
      .setTextColor("dark");
    // get body 
    this.getChild(0).getChild(0).getChild(1).addSpacing("px-3", "px-sm-5");

    this.setHeaderContent(
      new Row().addSpacing("p-3").alignItems("center").setGap(8).addChildren(
        new Icon("gear").setFontSize(20).scale(-1, 1),
        new Label("Settings").expose("label", this)
      )
    );
    this.setBodyContent(new Row().justifyItems("center").addSpacing("p-3").addChildren(
      new Form().expose("form", this).stretchX().setMaxWidth(500).addChildren(
        new Column().setGap(16).alignItems("start").addChildren(
          new DirectoryInput("Model Path", "modelPath", "", true).expose("modelPath", this),
          new Checkbox("Open Last Assistant On Start").addSpacing("mt-2").setName("openLastAssistant").expose("openLastAssistant", this),
        )
      )
    ));
    this.setFooterContent(new Row().justifyItems("end").addSpacing("p-2").setGap(20).addChildren(
      new Button("Close").setColor("secondary").onClick(() => {
        this.close();
      }),
      new Button("Save").onClick(() => {
        if (!this.form.validate()) return;

        const appDoc = appState.get();
        appDoc.modelPath = this.modelPath.getValue();
        appDoc.openLastAssistant = this.openLastAssistant.isChecked();
        window.electronAPI.saveApp(appDoc).then(() => {
          app.addAlert("Settings successfully saved", "success");
          assistantState.set(null);
          app.assistantPanel.setActive(-1);
          this.close();
        }).catch(err => {
          app.addAlert("Error saving settings", "danger");
          this.form.enable()
        })

        const newAssistant = {}
        const formData = this.form.getFormData();
        for (var pair of formData.entries()) {
          if (pair[0].endsWith("[]" || !newAssistant[pair[0]])) {
            newAssistant[pair[0].replace("[]", "")] = formData.getAll(pair[0]);
          }
          else {
            newAssistant[pair[0]] = pair[1];
          }
        }
        newAssistant.id = this.assistant?.id;
        newAssistant.type = "openai";
        this.form.disable();
        this.callback && this.callback(newAssistant).then(newAssistant => {
          this.close();
        }).catch(err => {
          this.form.enable()
        })
      })
    ));
  }

  open(callback) {
    this.callback = callback;
    this.appDoc = appState.get();
    this.form.enable().clearValidation();
    this.modelPath.setValue(this.appDoc.modelPath);
    this.openLastAssistant.setChecked(this.appDoc.openLastAssistant);
    super.open();
  }
}

/*********************************************** 
 * 
 *            STATES
 * 
 ***********************************************/

const assistantState = new State("assistant");
assistantState.subscribe((assistant) => {
  app.chatPanel.hide().busy();
  app.chatContainer.replaceChildren(new Widget().addSpacing("mt-auto"));;
  app.historyContainer.clearChildren();
  app.historyButton.hide();
  if (assistant) {
    window.electronAPI.getHistories(assistant.id).then(histories => {
      if (histories.length) {
        for (let history of histories) {
          app.historyContainer.addChild(new HistoryItem(history));
        }
        app.historyButton.show();
      }
      chatState.set(null);
    });
    app.chatTitle.setText(assistant.name);
    app.chatPanel.show();
    initAssistant(assistant.id);
    const appDoc = appState.get();
    appDoc.lastAssistantId = assistant.id;
    window.electronAPI.saveApp(appDoc);
  }
  else {
    app.assistantPanel.setActive(-1);
  }
});

const chatState = new State("chat");
chatState.subscribe((chat) => {
  app.chatContainer.replaceChildren(new Widget().addSpacing("mt-auto"));
  if (chat?.id) {
    window.electronAPI.getHistory(chat.id).then(_history => {
      if (!_history) {
        return;
      }
      for (let message of _history.messages) {
        app.chatContainer.addChild(new ChatBubble(message.content, message.role));
      }
      app.chatContainer.getDom().scrollTop = Number.MAX_SAFE_INTEGER;
      PR.prettyPrint();
    });
  }
});

const appState = new State("app")

/*********************************************** 
 * 
 *            EVENTS
 * 
 ***********************************************/

async function onSendButtonClick() {
  app.sendButton.setBusy();
  let message = app.userInput.getValue();
  const chatContainer = app.chatContainer;
  if (message) {
    let currentChat = chatState.get();
    if (!currentChat) {
      currentChat = { title: message.substr(0, 50) + "...", messages: [] };
      chatState.set(currentChat);
    }
    app.userInput.setValue("");
    app.userInput.setAttribute("rows", `1`);
    const responseBubble = new ChatBubble("...", "assistant");
    chatContainer.addChildren(new ChatBubble(message, "user"), responseBubble);
    responseBubble.scrollIntoView();
    PR.prettyPrint();
    let responseText = "";
    window.electronAPI.onRespond((response) => {
      responseText += response;
      responseBubble.setText(responseText);
      const chatPanelDom = chatContainer.getDom();
      const scrollEnd = chatPanelDom.scrollHeight - chatPanelDom.clientHeight;
      const scrollBottom = scrollEnd - chatPanelDom.scrollTop;
      if (scrollBottom < 50) {
        chatPanelDom.scrollTop = Number.MAX_SAFE_INTEGER;
      }
    });
    currentChat.id = await window.electronAPI.ask(message, currentChat.id, assistantState.get().id).catch(err => {
      if (err.message.includes("AbortError:")) {
        return;
      }
      if (err.message.includes("Aborted by user")) {
        return;
      }
      app.alertPopup.addAlert("Error connecting to assistant", "danger");
    });
    PR.prettyPrint();
    window.electronAPI.removeOnRespond();
    app.sendButton.setBusy(false);
    updateHistory(assistantState.get().id);
  }
}

async function onAbortResponseClick() {
  return window.electronAPI.abortResponse().catch(() => {
    app.addAlert("Error aborting response", "danger");
  });
}

async function onHistoryDeleteButtonClick(historyId) {
  return window.electronAPI.deleteHistory(historyId).then(() => {
    app.addAlert("History successfully deleted", "success");
    chatState.set(null);
  }).catch(() => {
    app.addAlert("Error deleting history", "danger");
  });
}

async function onClearHistoryButtonClick(assistant) {
  window.electronAPI.clearHistories(assistant.id).then(() => {
    app.historyContainer.clearChildren();
    chatState.set(null);
    app.historyButton.hide();
    app.addAlert("History successfully cleared", "success");
  }).catch(() => {
    app.addAlert("Error clearing history", "danger");
  });
}

async function onNewChatButtonClick() {
  chatState.set(null);
  app.historyContainer.clearChildren();
  window.electronAPI.getHistories(assistantState.get()?.id).then(histories => {
    if (histories.length) {
      for (let history of histories) {
        app.historyContainer.addChild(new HistoryItem(history));
      }
      app.historyButton.show();
    }
  });
}

async function onAssistantDuplicateButtonClick(assistant) {
  if (assistant) {
    const idx = app.assistantPanel.getIndexOf(assistant) + 1;
    window.electronAPI.duplicateAssistant(assistant.id).then(newAssistant => {
      app.assistantPanel.insertChild(idx, new AssistantCard(newAssistant)).setActive(idx);
      app.addAlert("Assistant successfully duplicated", "success");
      assistantState.set(newAssistant);
    }).catch(() => {
      app.addAlert("Error duplicating assistant", "danger");
    });
  }
}

async function onAssistantSaveButtonClick(assistant) {
  if (assistant) {
    const _assistant = { ...assistant };
    delete _assistant["$ctrl"]
    delete _assistant.meta
    delete _assistant.id
    delete _assistant.editable

    const assistantFile = JSON.stringify(_assistant, null, 2);
    const blob = new Blob([assistantFile], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    // create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `${_assistant.name}.json`;
    a.click();
  }
}

async function onAssistantEditButtonClick(assistant) {
  app[assistant.type === "llama" ? "editLlamaAssistantModal" : "editOpenaiAssistantModal"].open(assistant, updateAssistant);
}

async function onAssistantDeleteButtonClick(assistant) {
  app.confirmationModal.open("Delete Assistant", "Are you sure you want to delete this assistant?", () => {
    window.electronAPI.deleteAssistant(assistant.id).then(() => {
      app.assistantPanel.removeChild(app.assistantPanel.getChildren().find(child => child.assistant.id === assistant.id));
      assistantState.set(null);
      app.addAlert("Assistant successfully deleted", "success");
    }).catch(err => {
      app.addAlert("Error deleting assistant", "danger");
    });
  });
}

/*********************************************** 
 * 
 *            INITIALIZATION
 * 
 ***********************************************/

const textShades = [
  "#f8f9fa",
  "#acb9c4"
];

const bgShades = [
  "#1d1f2b",
  "#262837",
  "#313347"
];

const accentShades = [
  "#6784fe",
  "#5570dc",
  "#4b66d0",
];

const breakPoint = "lg";

const app = new AppUI().render().onLoad(self => {

});

window.electronAPI.getAssistants().then(assistants => {
  for (let assistant of assistants) {
    app.assistantPanel.addChild(new AssistantCard(assistant));
  }
  window.electronAPI.getApp().then(appDoc => {
    appState.set(appDoc);
    if (!appDoc.termsAccepted) {
      fetch("terms-and-conditions.md").then(res => res.text()).then(terms => {
        app.confirmationModal.open(
          "Terms and Conditions",
          terms,
          () => {
            appDoc.termsAccepted = true;
            window.electronAPI.saveApp(appDoc).then(() => {
              const asistantCard = app.assistantPanel.getChildren().find(child => child.assistant.name === "KodiBot");
              if (asistantCard) {
                asistantCard.click();
              }
            });
          }, window.electronAPI.quitApp, "Accept")
      })
    }
    else if (appDoc.openLastAssistant && appDoc.lastAssistantId) {
      const asistantCard = app.assistantPanel.getChildren().find(child => child.assistant.id === appDoc.lastAssistantId);
      if (asistantCard) {
        asistantCard.click();
      }
    }
  });
});

async function updateHistory(assistantId) {
  window.electronAPI.getHistories(assistantId).then(histories => {
    app.historyContainer.clearChildren();
    if (histories.length) {
      for (let history of histories) {
        app.historyContainer.addChild(new HistoryItem(history));
      }
      app.historyButton.show();
    }
  });
}

async function initAssistant(assistantId) {
  window.electronAPI.initAssistant(assistantId).then(res => {
    if (res === "download-model") {
      if (navigator.onLine) {
        app.confirmationModal.open("Download AI Model", "AI model needs to be downloaded before it can be used for the first time. Do you want to download it now?",
          () => {
            window.electronAPI.downloadModel(assistantId).then(res => {
              app.progressModal.open(() => {
                window.electronAPI.cancelDownload();
                window.electronAPI.removeOnDownloadProgress();
                app.addAlert("AI model download cancelled", "warning");
                app.chatPanel.error();
              });
              window.electronAPI.onDownloadProgress((progress) => {
                app.progressModal.setProgress(progress);
                if (progress === 100) {
                  app.progressModal.close();
                  window.electronAPI.removeOnDownloadProgress();
                  app.addAlert("AI model successfully downloaded", "success");
                  initAssistant(assistantId);
                }
              });
            }).catch(err => {
              app.chatPanel.error();
              app.addAlert("Error downloading AI model", "danger");
            });
          }, () => {
            app.chatPanel.error();
          });
      }
      else {
        app.addAlert("Missing AI model. Please connect to the internet to download the AI model", "warning");
      }
      return;
    }
    else if (res === "initialized") {
      app.chatPanel.enable();
      const appDoc = appState.get();
      if (appDoc.showWelcome) {
        const currentChat = { title: "Wellcome", messages: [] };
        currentChat.messages.push({ content: "Hey", role: "user" });
        currentChat.messages.push({ content: "Hello, I'm KodiBot, your personal AI assistant. I'm here to help you navigate the app and chat about anything! How can I assist you today?", role: "KodiBot" });
        chatState.set(currentChat);
        app.chatContainer.addChild(new ChatBubble(currentChat.messages[0].content, currentChat.messages[0].role));
        app.chatContainer.addChild(new ChatBubble(currentChat.messages[1].content, currentChat.messages[1].role));
        appDoc.showWelcome = false;
        window.electronAPI.saveApp(appDoc);
      }
    }
    else {
      return app.addAlert("Error initializing assistant", "danger");
    }
  }).catch(err => {
    if (err.message.includes("missing-model")) {
      app.alertPopup.addAlert("AI model missing, please add a model from the assistant settings", "warning");
    }
    else if (err.message.includes("missing-apikey")) {
      app.alertPopup.addAlert("Please add your API key in the assistant settings to connect to the assistant", "warning");
    }
    else if (err.message.includes("missing-apiurl")) {
      app.alertPopup.addAlert("Please add the API URL in the assistant settings to connect to the assistant", "warning");
    }
    else {
      app.alertPopup.addAlert("Error initializing assistant", "danger");
    }
    app.chatPanel.error();
  });
}

async function updateAssistant(updatedAssistant) {
  return window.electronAPI.updateAssistant(updatedAssistant).then(assistant => {
    updateAssistantCard(assistant);
    // app.addAlert("Assistant successfully updated", "success");
  }).catch(err => {
    app.addAlert("Error updating assistant", "danger");
  });
}

async function createAssistant(assistant) {
  return window.electronAPI.createAssistant(assistant).then(newAssistant => {
    const assistantCard = new AssistantCard(newAssistant)
    app.assistantPanel.insertChild(0, assistantCard).setActive(0);
    assistantState.set(newAssistant);
    assistantCard.scrollIntoView();
    app.addAlert("Assistant successfully created", "success");
  }).catch(() => {
    app.addAlert("Error duplicating assistant", "danger");
  });
}


function updateAssistantCard(newAssistant) {
  const assistantCard = app.assistantPanel.getChildren().find(child => child.assistant.id === newAssistant.id);
  if (assistantCard) {
    assistantCard.nameText.setText(newAssistant.name)
    assistantCard.descriptionText.setText(newAssistant.description);
    assistantCard.assistant.name = newAssistant.name;
    assistantCard.assistant.description = newAssistant.description;
    assistantCard.assistant.modelFile = newAssistant.modelFile;
    assistantCard.assistant.systemPrompt = newAssistant.systemPrompt;
    assistantCard.assistant.promptTemplate = newAssistant.promptTemplate;
    assistantCard.assistant.historyTemplate = newAssistant.historyTemplate;
    assistantCard.assistant.stopTemplate = newAssistant.stopTemplate;
    assistantCard.assistant.params = newAssistant.params;
  }
  if (assistantState.get().id === newAssistant.id) {
    assistantState.set(newAssistant);
  }
}

function getElapsedTime(date) {
  const daysPassed = Math.abs(Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24)));
  if (daysPassed < 8)
    return daysPassed === 0 ? "Today" : daysPassed === 1 ? "Yesterday" : `${daysPassed} days ago`;
  if (daysPassed < 32)
    return Math.floor(daysPassed / 7) == 1 ? " a week ago" : `${Math.floor(daysPassed / 7)} weeks ago`;
  if (daysPassed < 366)
    return Math.floor(daysPassed / 30) == 1 ? "a month ago" : `${Math.floor(daysPassed / 30)} months ago`;

  return Math.floor(daysPassed / 365) == 1 ? "a year ago" : `${Math.floor(daysPassed / 365)} years ago`;
}
