"use client";
import * as React from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export function Form({
  children,
  ...props
}: React.ComponentProps<typeof FormProvider>) {
  return <FormProvider {...props}>{children}</FormProvider>;
}

export function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  return <Label>{children}</Label>;
}

export function FormControl({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function FormMessage({ children }: { children?: React.ReactNode }) {
  const { formState } = useFormContext();
  if (!children && !formState.errors) return null;
  return <p className="text-sm text-red-600">{children}</p>;
}

export const FormField = ({
  name,
  render,
}: {
  name: string;
  render: (opts: any) => React.ReactNode;
}) => {
  const methods = useFormContext();
  return (
    <Controller name={name} control={methods.control} render={render as any} />
  );
};
