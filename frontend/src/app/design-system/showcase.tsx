"use client";

import { useState, type ReactNode } from "react";

import {
  Avatar, Badge, Button, Card, Checkbox, CourseCard, Dialog, Icon, IconButton, Input, LessonItem, PageHead, ProgressBar,
  ProgressRing, Radio, Select, Sidebar, StatCard, Switch, Tabs, Tag, Textarea, Toast, Tooltip, useToast,
} from "@/components/ui";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="ob-overline mb-3">{title}</div>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function ToastButton() {
  const toast = useToast();
  return <Button variant="secondary" iconLeft="bell" onClick={() => toast({ title: "Draft created", message: "Intro to ML · add your first lesson" })}>Show toast</Button>;
}

/** Every Orbitly component in one place, for checking against the UI kit. */
export function Showcase() {
  const [tab, setTab] = useState("progress");
  const [pill, setPill] = useState("Week");
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar
          sections={[
            { label: "Learn", items: [{ href: "/design-system", label: "Design system", icon: "layout-dashboard" }, { href: "/courses", label: "Browse courses", icon: "compass" }, { href: "/learn/courses", label: "My learning", icon: "book-open", badge: 3 }] },
            { label: "Teach", items: [{ href: "/teach", label: "Dashboard", icon: "presentation" }, { href: "/teach/grading", label: "Gradebook", icon: "clipboard-check" }] },
          ]}
        />
        <main className="mx-auto w-full max-w-[1240px] p-8">
          <PageHead overline="Orbitly" title="Design system" sub="Components ported from the Orbitly Portal UI kit." actions={<><ToastButton /><Button iconLeft="plus" onClick={() => setOpen(true)}>Open dialog</Button></>} />

          <Section title="Buttons">
            <Button>Primary</Button>
            <Button variant="dark">Dark</Button>
            <Button variant="secondary" iconLeft="compass">Secondary</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost" iconRight="arrow-right">Ghost</Button>
            <Button variant="danger" iconLeft="trash-2">Danger</Button>
            <Button size="sm">Small</Button>
            <Button size="lg" iconLeft="play">Large</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <IconButton icon="bell" label="Notifications" variant="secondary" />
            <IconButton icon="heart" label="Wishlist" round variant="secondary" />
          </Section>

          <Section title="Badges and tags">
            {(["neutral", "accent", "orbit", "success", "warning", "danger", "info", "dark"] as const).map((t) => <Badge key={t} tone={t} dot>{t}</Badge>)}
            <Tag selected>Data science</Tag>
            <Tag onClick={() => undefined}>Design</Tag>
            <Tag icon="filter" onRemove={() => undefined}>Beginner</Tag>
          </Section>

          <Section title="Avatars and tooltips">
            <Avatar name="Maya Okafor" size={44} status="online" />
            <Avatar name="Dr. Lena Park" size={44} />
            <Avatar name="Leo Brandt" size={36} status="away" />
            <Tooltip content="42 active learners"><Badge tone="orbit">Hover me</Badge></Tooltip>
          </Section>

          <Section title="Tabs">
            <Tabs value={tab} onChange={setTab} items={[{ label: "In progress", value: "progress", count: 3 }, { label: "Completed", value: "done", count: 1 }, { label: "Wishlist", value: "wish", count: 2 }]} />
            <Tabs variant="pill" value={pill} onChange={setPill} items={[{ label: "Week", value: "Week" }, { label: "Term", value: "Term" }]} />
          </Section>

          <Section title="Forms">
            <div className="grid w-full max-w-[720px] grid-cols-2 gap-4">
              <Input label="Email" placeholder="you@northfield.edu" iconLeft="mail" />
              <Input label="Password" type="password" error="At least 8 characters" />
              <Select label="Category" options={["Data science", "Design", "Business"]} />
              <Input label="Search" iconLeft="search" placeholder="Search courses" help="Try “regression”" />
              <Textarea label="Reply" placeholder="Ask a question or share a tip" containerStyle={{ gridColumn: "span 2" }} />
              <Checkbox label="Remember me" defaultChecked />
              <Radio name="r" label="Option A" description="With a description" defaultChecked />
              <Switch label="Email notifications" defaultChecked />
              <Switch label="Disabled" disabled />
            </div>
          </Section>

          <Section title="Progress">
            <ProgressBar value={72} showValue label="Progress" style={{ width: 280 }} />
            <ProgressBar value={100} showValue label="Completed" color="var(--success)" style={{ width: 280 }} />
            <ProgressRing value={72} size={88} stroke={8} />
            <ProgressRing value={38} />
          </Section>

          <Section title="Stat cards">
            <div className="grid w-full grid-cols-4 gap-4">
              <StatCard label="Enrolled learners" value="328" delta="+24" hint="this term" icon="users" tone="orbit" />
              <StatCard label="Avg. completion" value="67%" delta="+5%" icon="target" tone="green" />
              <StatCard label="To grade" value="4" icon="clipboard-check" tone="coral" hint="oldest 2 days" />
              <StatCard label="Course rating" value="4.8" icon="star" tone="amber" hint="214 reviews" delta="-0.1" trend="down" />
            </div>
          </Section>

          <Section title="Course cards">
            <div className="grid w-full grid-cols-3 gap-[18px]">
              <CourseCard title="Intro to Machine Learning" category="Data science" hue="orbit" icon="brain" instructor="Dr. Lena Park" rating={4.8} reviews={2134} lessons={8} duration="6h 40m" level="Beginner" price="$49.99" badge={<Badge tone="dark">Bestseller</Badge>} action={<IconButton icon="heart" label="Save" round variant="secondary" size="sm" />} />
              <CourseCard title="Python from Zero" category="Development" hue="green" icon="terminal" instructor="Aisha Rahman" rating={4.9} reviews={4210} lessons={8} duration="5h 45m" level="Beginner" price="Free" />
              <CourseCard title="Statistics for Decision Making" category="Mathematics" hue="sky" icon="sigma" instructor="Prof. Arun Mehta" lessons={8} progress={38} />
            </div>
          </Section>

          <Section title="Lesson items">
            <Card padding={8} style={{ width: 380 }}>
              <LessonItem index={1} title="What is a model?" kind="VIDEO" duration="8 min" status="done" />
              <LessonItem index={2} title="Your first dataset" kind="READING" duration="6 min" status="current" />
              <LessonItem index={3} title="Check your understanding" kind="QUIZ" duration="3 questions" />
              <LessonItem index={4} title="Problem set 4" kind="ASSIGNMENT" duration="Graded" status="locked" />
            </Card>
            <Card title="Upcoming deadlines" action={<Badge tone="accent">3</Badge>} style={{ width: 340 }}>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-sunken text-ink-700"><Icon name="file-text" size={18} /></span>
                <div>
                  <div style={{ font: "600 14px/20px var(--font-body)", color: "var(--text-strong)" }}>Problem set 4 — Regression</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Intro to ML · Tomorrow, 23:59</div>
                  <Badge tone="danger" style={{ marginTop: 6 }}>Due tomorrow</Badge>
                </div>
              </div>
            </Card>
          </Section>

          <Section title="Toasts">
            <Toast title="Lesson complete" message="2 lessons left in Foundations" />
            <Toast tone="info" light title="Live session at 13:30" message="Study group · Statistics" />
          </Section>

          <Dialog open={open} onClose={() => setOpen(false)} icon="send" title="Submit assignment?" description="You won’t be able to edit your submission afterwards." footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button iconLeft="send" onClick={() => setOpen(false)}>Submit</Button></>}>
            <Input label="Note to your instructor" placeholder="Optional" />
          </Dialog>
        </main>
      </div>
    </>
  );
}
