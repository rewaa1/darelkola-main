"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────
// Context – tells children whether to render as drawer
// ────────────────────────────────────────────────────────
const ResponsiveContext = React.createContext(false);

// ────────────────────────────────────────────────────────
// Root
// ────────────────────────────────────────────────────────
interface ResponsiveDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveContext.Provider value={isMobile}>
      {isMobile ? (
        <Drawer {...props}>{children}</Drawer>
      ) : (
        <Dialog {...props}>{children}</Dialog>
      )}
    </ResponsiveContext.Provider>
  );
}

// ────────────────────────────────────────────────────────
// Trigger
// ────────────────────────────────────────────────────────
function ResponsiveDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = React.useContext(ResponsiveContext);
  return isMobile ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />;
}

// ────────────────────────────────────────────────────────
// Close
// ────────────────────────────────────────────────────────
function ResponsiveDialogClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = React.useContext(ResponsiveContext);
  return isMobile ? <DrawerClose {...props} /> : <DialogClose {...props} />;
}

// ────────────────────────────────────────────────────────
// Content
// ────────────────────────────────────────────────────────
function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = React.useContext(ResponsiveContext);

  if (isMobile) {
    return (
      <DrawerContent>
        <div
          className={cn("overflow-y-auto max-h-[80vh] px-4 pb-6", className)}
        >
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

// ────────────────────────────────────────────────────────
// Header
// ────────────────────────────────────────────────────────
function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = React.useContext(ResponsiveContext);
  return isMobile ? (
    <DrawerHeader className={cn("text-left", className)} {...props} />
  ) : (
    <DialogHeader className={className} {...props} />
  );
}

// ────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────
function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const isMobile = React.useContext(ResponsiveContext);
  return isMobile ? (
    <DrawerFooter className={className} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  );
}

// ────────────────────────────────────────────────────────
// Title
// ────────────────────────────────────────────────────────
function ResponsiveDialogTitle({
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = React.useContext(ResponsiveContext);
  return isMobile ? <DrawerTitle {...props} /> : <DialogTitle {...props} />;
}

// ────────────────────────────────────────────────────────
// Description
// ────────────────────────────────────────────────────────
function ResponsiveDialogDescription({
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = React.useContext(ResponsiveContext);
  return isMobile ? (
    <DrawerDescription {...props} />
  ) : (
    <DialogDescription {...props} />
  );
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
};
