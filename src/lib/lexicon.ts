// The skills a job description can name. The fit check looks for these in
// the pasted text, then asks the search index about each one. A term that is
// here but not in my record is reported as missing, which is the point: the
// list is deliberately much wider than what I know.

const RAW = `
C++ | C# | Java | Python | Kotlin | TypeScript | JavaScript | Rust | Scala | Ruby | PHP | Swift | Objective-C | Perl | Haskell | Elixir | Erlang | Lua | Bash | Shell | SQL | Zig
distributed systems | search | search engine | information retrieval | ranking | relevance | query understanding | query rewriting | tokenization | indexing | retrieval | recommendation | recommender systems | personalization | embeddings | vector search | semantic search | machine learning | deep learning | NLP | natural language processing | LLM | generative AI | computer vision | data science | reinforcement learning
caching | latency | performance | scalability | reliability | availability | concurrency | multithreading | memory management | profiling | optimization | low latency | high throughput | real-time | streaming | batch processing | data pipelines | ETL
testing | unit tests | regression | integration tests | A/B testing | experimentation | traffic replay | code review | refactoring | debugging | on-call | incident response | observability | monitoring | logging | tracing | alerting | SRE
Linux | Docker | Kubernetes | Terraform | OpenTofu | Ansible | Helm | Proxmox | AWS | GCP | Azure | cloud | serverless | Lambda | S3 | EC2 | CI/CD | GitLab CI | GitHub Actions | Jenkins | Bazel | CMake | Git | GitOps | infrastructure as code | infrastructure | DevOps | networking | TCP | HTTP | DNS | VPN | load balancing | reverse proxy | nginx | Traefik | Envoy | service mesh | Istio
gRPC | REST | GraphQL | Protobuf | Thrift | microservices | API design | message queue | Kafka | RabbitMQ | Pulsar | Flink | Spark | Hadoop | Airflow | Elasticsearch | Lucene | Solr | OpenSearch | Redis | Memcached | PostgreSQL | MySQL | SQLite | MongoDB | Cassandra | DynamoDB | BigQuery | Snowflake | ClickHouse | NoSQL | databases | data modeling
Android | iOS | mobile | React | React Native | Next.js | Node.js | Angular | Vue | frontend | full stack | backend | web | CSS | HTML | Tailwind | Flutter | Jetpack Compose
embedded | firmware | RTOS | Zephyr | RISC-V | ARM | drivers | kernel | reverse engineering | Ghidra | security | cryptography | authentication | OAuth | OIDC | SSO | PAM | encryption | secrets management | compliance
GoogleTest | ASan | clang-tidy | sanitizers | Valgrind | gdb | perf | pandas | NumPy | PyTorch | TensorFlow | scikit-learn | Django | Flask | FastAPI | Spring | Spring Boot | Hibernate | Rails | .NET
leadership | mentoring | ownership | cross-functional | stakeholders | roadmap | architecture | system design | technical design | documentation | agile | scrum | open source | quantitative | backtesting | trading | statistics | e-commerce | marketplace | automotive | payments | fintech | healthcare | gaming | game development
`;

/** Other spellings a job description uses, mapped to the label above. */
const ALIASES: Record<string, string> = {
  cpp: "C++",
  golang: "Go",
  k8s: "Kubernetes",
  js: "JavaScript",
  ts: "TypeScript",
  postgres: "PostgreSQL",
  "unit testing": "unit tests",
  "unit test": "unit tests",
  "regression tests": "regression",
  "regression testing": "regression",
  "ab testing": "A/B testing",
  "a b tests": "A/B testing",
  "ml": "machine learning",
  "ci cd": "CI/CD",
  "continuous integration": "CI/CD",
  "large scale": "scalability",
  "at scale": "scalability",
  "multi threaded": "multithreading",
  "multithreaded": "multithreading",
  "iac": "infrastructure as code",
  "restful": "REST",
  "search systems": "search",
  "search infrastructure": "search",
  "query parsing": "query understanding",
  "mentor": "mentoring",
  "lead": "leadership",
  "owning": "ownership",
  "own": "ownership",
  "large language models": "LLM",
  "llms": "LLM",
};

export const LEXICON: string[] = RAW.split(/[|\n]/)
  .map((s) => s.trim())
  .filter(Boolean);

export { ALIASES as LEXICON_ALIASES };

/**
 * Skills whose name is also an ordinary word. They only count when written
 * the way the skill is written: "Go" capitalised and not followed by a
 * preposition, "R" next to another language.
 */
export const CASE_SENSITIVE: { label: string; pattern: RegExp }[] = [
  { label: "Go", pattern: /\bGolang\b|\bGo\b(?=\s*(?:,|\/|\band\b|\bor\b|\)|\.|$|\bprogramming\b|\bservices?\b|\bdevelop))/m },
  { label: "C", pattern: /\bC\b(?=\s*(?:,|\/(?!C\+\+)|\band\b|\bor\b|\bprogramming\b))(?!\+)/m },
];

/**
 * For a skill this site never writes in those words, the plain words it does
 * use for the nearest thing. The fit check reports these as adjacent and
 * names the stand-in, so the reader can judge the distance.
 */
export const NEAREST_ON_SITE: Record<string, string> = {
  "CI/CD": "CI",
  "information retrieval": "search retrieval",
  "infrastructure as code": "OpenTofu",
  "secrets management": "SOPS",
  "reverse proxy": "Traefik",
  "memory management": "PMR allocators",
  "technical design": "architecture",
  "system design": "architecture",
  "game development": "RPG",
};
