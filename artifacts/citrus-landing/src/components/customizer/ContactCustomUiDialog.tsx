import { useState } from "react";
import { useCreateCustomUiRequest } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContactCustomUiDialogProps {
  gameId: string | undefined;
}

export function ContactCustomUiDialog({ gameId }: ContactCustomUiDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate, isPending } = useCreateCustomUiRequest();

  const handleSubmit = () => {
    mutate(
      { data: { gameId, name, email, message } },
      { onSuccess: () => setSubmitted(true) },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitted(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-request-custom-ui">
          Want a fully custom UI? Contact us
        </Button>
      </DialogTrigger>
      <DialogContent>
        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <DialogTitle>Thanks — we got it.</DialogTitle>
            <p className="text-muted-foreground text-sm">
              We'll reach out to {email} to talk through your custom UI.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request a custom UI build</DialogTitle>
              <DialogDescription>
                Tell us what you have in mind and we'll follow up to scope a fully bespoke build.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" data-testid="input-contact-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  data-testid="input-contact-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">What are you looking for?</Label>
                <Textarea
                  id="contact-message"
                  data-testid="input-contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={!name || !email || !message || isPending}
                data-testid="button-submit-contact"
              >
                {isPending ? "Sending…" : "Send request"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
