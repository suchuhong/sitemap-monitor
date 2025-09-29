"use client";
import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type FieldState,
  type UseFormStateReturn,
} from "react-hook-form";
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

type RenderArgs<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: FieldState;
  formState: UseFormStateReturn<TFieldValues>;
};

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  render,
}: {
  name: TName;
  render: (args: RenderArgs<TFieldValues, TName>) => React.ReactNode;
}) {
  const methods = useFormContext<TFieldValues>();
  return (
    <Controller
      name={name}
      control={methods.control}
      render={(props) => render(props as RenderArgs<TFieldValues, TName>)}
    />
  );
}
