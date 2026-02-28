# UI Standards

## Rule: Shadcn UI Only

**All UI in this project must be built exclusively with Shadcn UI components. Do not create custom UI components.**

If a Shadcn component doesn't exist for a use case, install it via the CLI:

```bash
npx shadcn@latest add <component-name>
```

---

## Available Components

The following Shadcn components are already installed in `components/ui/`:

| Component | Usage |
|-----------|-------|
| `accordion` | Collapsible content sections |
| `alert` | Inline status messages |
| `alert-dialog` | Destructive action confirmations |
| `avatar` | User/bot profile images |
| `badge` | Status labels and tags |
| `button` | All clickable actions |
| `card` | Content containers |
| `checkbox` | Boolean form inputs |
| `dialog` | Modal overlays |
| `dropdown-menu` | Contextual action menus |
| `form` | Form wrapper with React Hook Form integration |
| `input` | Text inputs |
| `label` | Form field labels |
| `select` | Dropdown selectors |
| `separator` | Visual dividers |
| `sheet` | Side panel overlays |
| `sidebar` | Navigation sidebar |
| `skeleton` | Loading placeholders |
| `switch` | Toggle inputs |
| `table` | Tabular data |
| `tabs` | Tabbed navigation |
| `textarea` | Multi-line text inputs |
| `toast` / `toaster` | Notification toasts (use `useToast` hook) |

---

## Configuration

- **Style**: `new-york`
- **Base color**: defined via HSL CSS variables in `globals.css`
- **Icons**: Lucide React only (`lucide-react`)
- **Fonts**: `Inter` (body/sans) and `Outfit` (headings) — applied via Tailwind

---

## Usage Examples

### Button

```tsx
import { Button } from "@/components/ui/button"

<Button variant="default">Save</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Close</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

### Form (React Hook Form + Zod)

```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### Toast

```tsx
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()

toast({ title: "Saved", description: "Your changes were saved." })
toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge"

<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Canceled</Badge>
<Badge variant="outline">Draft</Badge>
```

### Dialog

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

---

## Rules

1. **No custom UI components.** Do not build custom buttons, inputs, modals, dropdowns, or any other UI primitives from scratch.
2. **No raw HTML for UI.** Do not use raw `<div>`, `<button>`, `<input>`, etc. when a Shadcn equivalent exists.
3. **No external UI libraries.** Do not install or use other component libraries (Material UI, Ant Design, Chakra, etc.).
4. **Styling is Tailwind only.** Apply additional styles via Tailwind utility classes on top of Shadcn components. Do not write custom CSS files for components.
5. **Variants before overrides.** Always prefer the available `variant` and `size` props before adding custom classes.
6. **Icons via Lucide.** Use `lucide-react` for all icons. Do not import icons from other packages.
7. **If a component is missing**, install it with `npx shadcn@latest add <name>` — do not build it.
