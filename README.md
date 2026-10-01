# Northstar docs chat

This is a small chat over five short documents. They describe a made-up patient support program called Northstar. It is not a real medicine. I used that so you can check an answer against the file it came from.

If you ask what to do when a dose is missed, it answers from the dosing note and shows that source. If you ask for the capital of France, it says it does not have that. The refusal happens in code, before Grok is called. I built this in one evening, so there is no login, no file upload, and no agent.

## Setup

You need Node 22 and an xAI API key.

Copy `.env.example` to `.env.local` and set `XAI_API_KEY`. The chat model defaults to `grok-4.3`.

```bash
npm install
npm run ingest
npm run dev
```

Open http://localhost:3000. Ingest writes `data/index.json`. The app will not answer until that file exists. The first question downloads the local embedding model into `.cache`. That folder is not committed.

```bash
npm test
docker build -t northstar .
docker run --env-file .env.local -p 3000:3000 northstar
```

The tests do not call xAI. They use fake vectors. I have not run the Docker image on this machine, because Docker is not installed here. `npm run build` does work, and that is the build step in the Dockerfile.

## What a question does

```text
question
  -> turn it into numbers with the local model
  -> compare those numbers with the saved chunks
  -> best score too low? reply "I don't have that", and do not call Grok
  -> otherwise Grok writes the answer from those chunks only
  -> the page shows the answer and the source heading
```

The page lists the five documents, shows the chat, and has a box to type in. The chat on screen is only a record of what was said. The next question does not remember the last one. "What about weekends?" will miss unless those words are in the documents. I left that as a known limit.

## How the search works

I split the files on headings. These files are short, so a heading is about the size of the bit you would point at. A section is only split again if it is longer than 900 characters. Cutting them into tiny pieces would have made the sources worse.

`npm run ingest` turns each chunk into a list of numbers and saves them in `data/index.json`. The model that does this is local. It is called `Xenova/all-MiniLM-L6-v2`. I wanted xAI to do the embeddings as well as the chat. I asked this API key which embedding models it has, and the list came back empty. Asking for the model named `v1` came back as not found. I was not going to sign up to a second service for five documents. The written answer still comes from Grok. If xAI adds an embedding model later, `lib/embed.ts` is the file I would change, and I would run ingest again.

Each question is turned into numbers on its own. I then look for the closest chunk. Closest means cosine similarity: a score for how alike two lists of numbers are.

During ingest I also try a few questions I already know the answer to, and a few that are nothing to do with these documents. The cutoff sits between those two groups. On this pack it came out around 0.31.

If the best score is under that cutoff, the API returns a fixed "I don't have that" and does not call Grok. I do not trust a prompt on its own for this. Models still make something up when you only tell them not to. If the match is weak, the model never sees the question.

If the score is high enough, I only keep other chunks that are close to the best one, within 0.12, and never more than three. Otherwise a section that is only slightly related shows up as a source. Grok 4.3 then writes the answer from those chunks. I turned reasoning off. The answer is a couple of sentences, and I have seen reasoning models spend the whole allowance before they write anything useful.

Every question writes one JSON log line. It includes the question, the chunk ids, the scores, how long it took, which model ran, and whether it refused.

## Why I built it this way

I chose "chat with your docs", and the files are already in the repo. If I had started with people uploading PDFs, the evening would have gone on a file parser instead of the search.

I used Next.js and TypeScript because that is what I can read and fix quickly. The search code sits in one small module. I could move that module to Python later. The steps would stay the same.

I saved the vectors in a JSON file. Five documents do not need their own vector database. A native SQLite addon was also likely to be a problem on Windows the night I built this.

## If a customer actually used this

I would keep the same steps and change where the pieces live. On AWS that would be:

- The same container, on App Runner or ECS. One instance is enough until there is real traffic.
- The API key in Secrets Manager, not inside the image.
- The documents in S3. Building the index would be its own job, not something that runs when someone asks a question.
- The vectors in Postgres with pgvector. I would add normal keyword search next to the vector search. I would only add a reranker once I had examples where the first search picked the wrong chunk.
- The same JSON logs in CloudWatch, with an alarm if refusals or response time suddenly jump.

Azure, GCP, or Cloudflare would be the same parts. Somewhere for the files, a database that can store the vectors, a container, a safe place for the key, and logs. I would not start with Kubernetes for this.

I would also keep a list of questions where I already know the right source, plus questions that should be refused. I would run that list whenever I change the prompt or how the files are split.

## What I tested, and what I left out

I tested the heading splits, the ranking, the cutoff, and the path that must not call the model. There is a Dockerfile, and a GitHub Action that runs `npm test`. The real key stays in `.env.local`. `.env.example` has no real key.

I left out login, upload, PDF parsing, rate limits, a hosted vector database, keyword search next to vectors, a reranker, and a browser test in CI. Those matter if this is running for a customer. They were not the risk in a one-evening demo. The page shows a normal answer, a refusal, and an error if the API fails.

## How I used AI while building this

I used Cursor. Before it wrote code, I had already decided the scope: one set of documents, answer or refuse, and nothing else. I read the search code, the prompt, and the tests, and I ran them. I am fine with it writing the repetitive parts. I am not fine with it adding structure I could not explain, or with sending a README I have not rewritten.

## What I would add next

1. Turn a follow-up into a full question before searching, so "what about weekends?" can work.
2. Add keyword search next to the vectors. Add a reranker only if examples show the first search is picking the wrong chunk.
3. Move the index to pgvector, and run ingest as its own job.
4. Check the written answer actually stays inside the text it cited.
5. Run the known questions in CI.
6. Add file upload only after refusal still works on documents I did not write.

I would not add a multi-agent setup for this. The task is to find the right text, then answer or say it is not there.

## Screenshots

- `screenshots/01-sources.png` — the document list
- `screenshots/02-answered.png` — a dosing answer with its source
- `screenshots/03-refused.png` — an off-topic question refused
