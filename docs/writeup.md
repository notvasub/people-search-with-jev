# People Search with Jev

A search engine gives you possible sources. It does not tell you which one is worth reading next. That decision is the heart of this experiment: put TypeSafe's Jev between discovery and retrieval, let it judge a small set of candidate actions, and keep the research workflow itself in ordinary code.

We tested the idea on a public research question about Linear's technology stack. Both routes started from the same plan and used the same rules for reading pages and supporting claims. The standard route followed provider order. The Jev-guided route asked which action was relevant and likely to add new evidence.

In the recorded run, the Jev-guided route made **10 retrieval calls instead of 18**, and **15 total provider calls instead of 23**. It took **63.1 seconds instead of 74.4**. Known provider spend was **$0.0587 instead of $0.0915**. Both routes surfaced **three supported findings**.

The most revealing moment was a choice among six possible links. Jev selected three, including [Linear's developer documentation](https://linear.app/developers) and its own [engineering post about multi-region support](https://linear.app/now/how-we-built-multi-region-support-for-linear). The resulting research surfaced Linear's description of **Cloudflare Workers routing requests across regional deployments**. This was a more specific infrastructure finding than a generic list of technologies: it connected a named system to a stated production role and a first-party source.

That is the novelty. Jev did not write the answer, fetch the page, or declare a claim true. It changed **where the researcher looked next**. Each choice can be replayed: the candidate list, the selected links, the model's judgment, and the evidence that followed are visible. The result is an inspectable research path rather than an unexplained list of search results.

People search is a natural next application. A name, role, and company can produce several plausible profiles. The useful next move may be an employer page, a conference bio, a professional profile, or a query that separates two people with the same name. Jev can help choose that move while the system keeps identity checks, source citations, and uncertainty explicit. The aim is simple: **spend research effort on the next source most likely to resolve the question.**
