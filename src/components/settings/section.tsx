import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionProps {
  title: string;
  description: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  children: ReactNode;
}

/** One card per settings group, with its own Save so a half-finished form elsewhere is never saved by accident. */
export function Section({ title, description, dirty, saving, onSave, onDiscard, children }: SectionProps) {
  return (
    <Card className="shadow-card">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 py-4">{children}</CardContent>
        <CardFooter className="gap-2">
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            Save changes
          </Button>
          <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={onDiscard}>
            Discard
          </Button>
          {dirty ? <span className="text-xs text-muted-foreground" role="status">Unsaved changes</span> : null}
        </CardFooter>
      </form>
    </Card>
  );
}
