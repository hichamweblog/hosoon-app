"use client";
import { Component, type ReactNode } from "react";
import { Button } from "./ui/button";
import { AppModal } from "./ui/app-modal";
import { reportDiagnostic } from "@/lib/diagnostics";
export default class ScreenBoundary extends Component<{ children: ReactNode; onClose?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { reportDiagnostic("screen-render-failed"); }
  render() {
    if (!this.state.failed) return this.props.children;
    const content = <div role="alert" className="p-5 space-y-3"><p className="font-bold">تعذّر فتح هذه الشاشة</p><p className="text-sm text-muted-foreground">قد يكون التحديث أو الاتصال سببًا. لم نعد ضبط بياناتك. أعد فتح الشاشة أو حدّث الصفحة بعد حفظ تقدمك.</p><Button variant="outline" onClick={() => this.setState({ failed: false })}>حاول مجددًا</Button></div>;
    return this.props.onClose ? <AppModal title="تعذر فتح الشاشة" onClose={this.props.onClose}>{content}</AppModal> : content;
  }
}
