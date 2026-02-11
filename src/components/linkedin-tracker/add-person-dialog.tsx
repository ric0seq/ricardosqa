"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { X } from "lucide-react";

interface AddPersonDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddPersonDialog({ open, onClose, onAdded }: AddPersonDialogProps) {
  const [name, setName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [category, setCategory] = useState<"founder_in_stealth" | "operator_at_company">("founder_in_stealth");
  const [currentRole, setCurrentRole] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/linkedin-tracker/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          linkedinUrl,
          category,
          currentRole: currentRole || undefined,
          currentCompany: currentCompany || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add person");
      }

      // Reset form
      setName("");
      setLinkedinUrl("");
      setCategory("founder_in_stealth");
      setCurrentRole("");
      setCurrentCompany("");
      setNotes("");
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Track New Person</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">LinkedIn URL *</label>
              <Input
                placeholder="https://linkedin.com/in/janesmith"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tracking Category *</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={category === "founder_in_stealth" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory("founder_in_stealth")}
                >
                  Founder in Stealth
                </Button>
                <Button
                  type="button"
                  variant={category === "operator_at_company" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory("operator_at_company")}
                >
                  Operator at Company
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {category === "founder_in_stealth"
                  ? "Get notified when they announce a company or make their venture public."
                  : "Get notified when they leave their current company or change roles."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Role</label>
                <Input
                  placeholder="CEO"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Company</label>
                <Input
                  placeholder="Stealth / Acme Corp"
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Why are you tracking this person?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Start Tracking"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
