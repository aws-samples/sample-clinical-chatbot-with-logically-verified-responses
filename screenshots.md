# Screenshots

When the chatbot starts, on the righthand pane contains a natural language representation of the theory that the chatbot agent will use to derive subsequent assistant's responses:

![screenshot 1](assets/1.png)

By clicking on the recycling-like button on the top right we can see an alternative view: the WFFs that constitute the theory in the right-hand pane. Note that this includes axioms to support the Closed World Assumption:

![screenshot 2](assets/2.png)

We start by asking the chatbot a very simple question, we first see indications of what the agent is doing:

![screenshot 3](assets/3.png)

and, finally, we see the result:

![screenshot 4](assets/4.png)

By clicking on the assistant's response speech bubble, we see an alternative view of the response:

![screenshot 5](assets/5.png)

When the set of medical records is trivial, the chatbot Agent will usually be correct. To facilitate testing on these trivial data sets, we added a module that _corrupts_ the chatbot Agent’s response to mimic a poorly performing model (poorly performing either because the model is weak, or because the theory is complicated, or both). We try again:

![screenshot 6](assets/6.png)

Notice that it is flagging this response as being logically not compatible with the facts. We can also see the usual behind-the-scenes details:

![screenshot 7](assets/7.png)


We can also ask more complicated questions:

![screenshot 9](assets/8.png)

And, like before, we can click on the assistant response to see the
alternative view. Note here that the natural language statement has
been converted into a logical statement that is non-trivial:

![screenshot 9](assets/9.png)

And here is another example:

![screenshot 10](assets/10.png)

With the details:

![screenshot 11](assets/11.png)
