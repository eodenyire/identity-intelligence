import { motion } from "framer-motion";

const layers = [
  { label: "Client Apps & SDKs", sub: "React · Kotlin · Swift", color: "border-primary bg-primary/5" },
  { label: "API Gateway", sub: "Kong · Rate Limiting · OAuth", color: "border-primary/60 bg-primary/5" },
  { label: "Microservices Layer", sub: "Go + Python · gRPC · REST", color: "border-accent bg-accent/5" },
  { label: "Event Streaming", sub: "Apache Kafka · Real-time Events", color: "border-amber-glow bg-amber-glow/5" },
  { label: "Stream Processing", sub: "Apache Flink · Fraud Detection", color: "border-emerald-glow bg-emerald-glow/5" },
  { label: "Data Layer", sub: "PostgreSQL · Neo4j · Cassandra · Elasticsearch", color: "border-violet-glow bg-violet-glow/5" },
  { label: "ML & Decision Engine", sub: "TensorFlow · PyTorch · Trust Score (0-1000)", color: "border-rose-glow bg-rose-glow/5" },
];

const ArchitectureSection = () => {
  return (
    <section id="architecture" className="py-32 relative">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-xs font-mono text-primary uppercase tracking-widest">System Architecture</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6">
            Production-Grade <span className="text-gradient-primary">Infrastructure</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Microservices, event-driven pipelines, multi-model databases, and real-time ML — 
            built to handle billions of identity verifications.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`border ${layer.color} rounded-xl p-5 mb-3 flex items-center justify-between group hover:shadow-glow-sm transition-all`}>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{layer.label}</h3>
                  <p className="text-sm font-mono text-muted-foreground">{layer.sub}</p>
                </div>
                <div className="text-xs text-muted-foreground font-mono">Layer {i + 1}</div>
              </div>
              {i < layers.length - 1 && (
                <div className="flex justify-center my-1">
                  <div className="w-px h-4 bg-border" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Tech logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 flex flex-wrap justify-center gap-6"
        >
          {["Go", "Python", "Kafka", "Flink", "PostgreSQL", "Neo4j", "Kubernetes", "TensorFlow"].map((tech) => (
            <div key={tech} className="px-5 py-2 rounded-full border border-border text-xs font-mono text-muted-foreground hover:border-glow hover:text-primary transition-colors">
              {tech}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
