import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { SectionForm } from "./SectionForm";

const meta: Meta<typeof SectionForm> = {
  title: "Compliance/SectionForm",
  component: SectionForm,
};

export default meta;
type Story = StoryObj<typeof SectionForm>;

// Helper: click a radio button for a field
async function clickRadio(
  canvas: ReturnType<typeof within>,
  fieldId: string,
  value: "Yes" | "No",
) {
  const radios = canvas.getAllByRole("radio") as HTMLInputElement[];
  const match = radios.find(
    (r) =>
      r.getAttribute("name") === fieldId && r.getAttribute("value") === value,
  );
  if (!match) {
    // Fallback: find by label text containing field id, then find radio in same group
    const label = canvas.getByText(new RegExp(`\\[${fieldId}\\]`));
    const group = label.closest(".group-layout, [class*='group']")?.parentElement ?? label.parentElement!;
    const groupRadios = group.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const fallback = Array.from(groupRadios).find((r) => r.value === value);
    if (fallback) {
      await userEvent.click(fallback);
      return;
    }
    throw new Error(`Radio not found: ${fieldId} = ${value}`);
  }
  await userEvent.click(match);
}

// Helper: type into a detail text field
async function fillDetail(
  canvas: ReturnType<typeof within>,
  fieldId: string,
  text: string,
) {
  // Detail fields have scope #/properties/{fieldId}_detail
  const input = await waitFor(() => {
    const inputs = canvas.getAllByRole("textbox") as HTMLInputElement[];
    const match = inputs.find(
      (i) => i.id?.includes(`${fieldId}_detail`) || i.name?.includes(`${fieldId}_detail`),
    );
    if (!match) {
      // Try finding by nearby label
      const labels = document.querySelectorAll("label");
      for (const label of labels) {
        const control = label.closest("[class*='control']");
        if (control) {
          const inp = control.querySelector("input[type='text'], textarea") as HTMLInputElement;
          if (inp && !inp.closest("[hidden]")) {
            // Check if this is near our field
            const scope = control.querySelector(`[id*="${fieldId}_detail"]`);
            if (scope) return inp;
          }
        }
      }
      throw new Error(`Detail input not found for ${fieldId}`);
    }
    return match;
  }, { timeout: 3000 });
  await userEvent.clear(input);
  await userEvent.type(input, text);
}

// Helper: wait for form to finish loading
async function waitForFormLoaded(canvasElement: HTMLElement) {
  await waitFor(
    () => {
      const loading = canvasElement.querySelector(".text-gray-500");
      if (loading && loading.textContent?.includes("Loading form")) {
        throw new Error("Still loading");
      }
    },
    { timeout: 5000 },
  );
}

/**
 * Default: renders Section 4.1 form with all Yes/No radio fields visible.
 */
export const Default: Story = {
  args: {
    legislationId: "aml-ctf-rules",
    sectionId: "4_1",
  },
  play: async ({ canvasElement }) => {
    await waitForFormLoaded(canvasElement);
    const canvas = within(canvasElement);
    // Verify the form rendered with at least some radio buttons
    const radios = canvas.getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
    // Verify Save button exists
    expect(canvas.getByText("Save Progress")).toBeTruthy();
  },
};

/**
 * Interactive play test: fills out Section 4.1 with realistic answers.
 * Tests conditional visibility, detail text inputs, and auto-save.
 */
export const FillIntroductionForm: Story = {
  args: {
    legislationId: "aml-ctf-rules",
    sectionId: "4_1",
  },
  play: async ({ canvasElement }) => {
    await waitForFormLoaded(canvasElement);
    const canvas = within(canvasElement);

    // 1. Answer 4_1_2_1 = "Yes" (pre-commencement customers)
    await clickRadio(canvas, "4_1_2_1", "Yes");

    // 2. Answer 4_1_2_2 = "No"
    await clickRadio(canvas, "4_1_2_2", "No");

    // 3. Answer 4_1_3_1 = "Yes" -> should show sub-fields 4_1_3_1_a, 4_1_3_1_b
    await clickRadio(canvas, "4_1_3_1", "Yes");

    // Verify conditional sub-fields appeared
    await waitFor(
      () => {
        expect(canvas.getByText(/\[4_1_3_1_a\]/)).toBeTruthy();
        expect(canvas.getByText(/\[4_1_3_1_b\]/)).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // 4. Fill detail text for 4_1_3_1
    await fillDetail(canvas, "4_1_3_1", "We consider individual and corporate customers");

    // 5. Answer sub-fields
    await clickRadio(canvas, "4_1_3_1_a", "Yes");
    await clickRadio(canvas, "4_1_3_1_b", "Yes");

    // 6. Answer remaining 4_1_3_x fields = "Yes" with detail text
    for (const fieldNum of ["2", "3", "4", "5", "6", "7"]) {
      const fieldId = `4_1_3_${fieldNum}`;
      await clickRadio(canvas, fieldId, "Yes");
      await fillDetail(canvas, fieldId, `Compliance details for ${fieldId}`);
    }

    // 7. Answer 4_1_4_1 = "Yes" -> should show Part 4.2 group
    await clickRadio(canvas, "4_1_4_1", "Yes");
    await waitFor(
      () => {
        expect(canvas.getByText(/\[4_2\]/)).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // 8. Fill remaining 4_1_4_x and 4_1_5_x fields
    for (const fid of ["4_1_4_2", "4_1_4_3", "4_1_4_4", "4_1_4_5", "4_1_4_6", "4_1_4_7", "4_1_5_1", "4_1_5_2", "4_1_8"]) {
      await clickRadio(canvas, fid, "Yes");
    }

    // 9. Answer Part 4.2 fields
    await clickRadio(canvas, "4_2_2", "Yes");
    await clickRadio(canvas, "4_2_3", "Yes");

    // Verify 4_2_3 sub-fields appear
    await waitFor(
      () => {
        expect(canvas.getByText(/\[4_2_3_1\]/)).toBeTruthy();
        expect(canvas.getByText(/\[4_2_3_2\]/)).toBeTruthy();
        expect(canvas.getByText(/\[4_2_3_3\]/)).toBeTruthy();
      },
      { timeout: 3000 },
    );

    await clickRadio(canvas, "4_2_3_1", "Yes");
    await clickRadio(canvas, "4_2_3_2", "Yes");
    await clickRadio(canvas, "4_2_3_3", "Yes");
    await clickRadio(canvas, "4_2_4", "Yes");
    await clickRadio(canvas, "4_2_4_1", "Yes");

    // 10. Click Save Progress
    await userEvent.click(canvas.getByText("Save Progress"));
  },
};

/**
 * Verifies conditional fields stay hidden when parent answers "No".
 */
export const ConditionalFieldsHidden: Story = {
  args: {
    legislationId: "aml-ctf-rules",
    sectionId: "4_1",
  },
  play: async ({ canvasElement }) => {
    await waitForFormLoaded(canvasElement);
    const canvas = within(canvasElement);

    // Answer 4_1_3_1 = "No" -> sub-fields should NOT appear
    await clickRadio(canvas, "4_1_3_1", "No");

    // Wait a bit for any re-renders
    await new Promise((r) => setTimeout(r, 500));

    // 4_1_3_1_a and 4_1_3_1_b should NOT be visible
    const allText = canvasElement.textContent || "";
    expect(allText).not.toContain("[4_1_3_1_a]");
    expect(allText).not.toContain("[4_1_3_1_b]");

    // Answer 4_1_4_1 = "No" -> Part 4.2 group should NOT appear
    await clickRadio(canvas, "4_1_4_1", "No");
    await new Promise((r) => setTimeout(r, 500));

    expect(canvasElement.textContent || "").not.toContain("[4_2]");
  },
};

/**
 * Renders Section 4.2 to verify multi-section support.
 */
export const Section4_2: Story = {
  args: {
    legislationId: "aml-ctf-rules",
    sectionId: "4_2",
  },
  play: async ({ canvasElement }) => {
    await waitForFormLoaded(canvasElement);
    const canvas = within(canvasElement);
    // Verify form rendered
    const radios = canvas.getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
  },
};
