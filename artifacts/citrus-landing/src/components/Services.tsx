import React from "react";
import { motion, type Variants } from "framer-motion";
import { Code2, Target, PenTool, RefreshCcw, Users, Zap } from "lucide-react";

const services = [
  {
    title: "Sports-Based Interactive Games",
    description: "We design fast-paced basketball and soccer games tailored for booth environments, focused on quick engagement, intuitive controls, and high replay value.",
    icon: Target,
  },
  {
    title: "Endless Runner Experiences",
    description: "Inspired by cyber adventure gameplay, we build immersive endless runner games that keep users engaged while delivering brand messages through interactive storytelling.",
    icon: Zap,
  },
  {
    title: "Booth Engagement Solutions",
    description: "Our games are specifically built for exhibitions and activations — optimized for quick play sessions, crowd attraction, and maximum on-ground interaction.",
    icon: Users,
  },
  {
    title: "Reusable Game Engines",
    description: "We develop scalable game logic that can be quickly adapted across multiple themes, allowing faster delivery and cost-effective customization for different brands.",
    icon: RefreshCcw,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function Services() {
  return (
    <section id="services" className="py-32 bg-background relative">
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="mb-16 md:mb-24 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold text-foreground mb-4"
          >
            Our Services
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-24 h-1 bg-primary mx-auto rounded-full"
          />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
        >
          {services.map((service, index) => (
            <motion.div key={index} variants={itemVariants}>
              <div className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                  <service.icon size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
