# Plan: Add "Share Presentation" Button to Commercial Presentation Screen

The goal is to add a "Share Presentation" button to the `/os/comercial/apresentacoes` screen. This button will generate a public sharing link (using the `/share/$nicho` route) and copy it to the clipboard, allowing sellers to share the presentation with prospects without requiring them to log in.

## Technical Details

- **Route File**: `src/routes/_authenticated.os.comercial.apresentacoes.index.tsx`
- **Actions**:
    - Add a new "Compartilhar Apresentação" button next to "Iniciar Apresentação".
    - Implement a function to generate the public URL: `https://valtrolabs.pro/share/${nicho}?company=${empresa}&city=${cidade}`.
    - Use the Clipboard API to copy the link and `sonner` for user feedback.
    - Ensure the button is only active when the required fields (`nicho` and `empresa`) are filled.

## Changes

### 1. Frontend - Presentations Page
- Add `Share2` icon from `lucide-react`.
- Import `toast` from `sonner`.
- Add the `handleShare` function.
- Update the UI to include the new button in the `CardFooter`.

```text
+------------------------------------------+
|  [Iniciar Apresentação] [Compartilhar]   |
+------------------------------------------+
```
