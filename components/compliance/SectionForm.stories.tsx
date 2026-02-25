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
    const label = canvas.getByText(new RegExp(`\\[${fieldId}\\]`));
    const group = label.closest(".group-layout, [class*='group']")?.parentElement ?? label.parentElement!;
    const groupRadios = (group as Element).querySelectorAll('input[type="radio"]');
    const fallback = Array.from(groupRadios).find((r) => (r as HTMLInputElement).value === value) as HTMLInputElement | undefined;
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
  const input = await waitFor(() => {
    const inputs = canvas.getAllByRole("textbox") as HTMLInputElement[];
    const match = inputs.find(
      (i) => i.id?.includes(`${fieldId}_detail`) || i.name?.includes(`${fieldId}_detail`),
    );
    if (!match) throw new Error(`Detail input not found for ${fieldId}`);
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
 * Default: renders the ML/TF Risk Assessment form.
 */
export const Default: Story = {
  args: {
    regulationId: "aml-ctf-rules",
    sectionId: "risk-assessment",
  },
  play: async ({ canvasElement }) => {
    await waitForFormLoaded(canvasElement);
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
    expect(canvas.getByText("Save Progress")).toBeTruthy();
  },
};

/**
 * Interactive play test: fills out the ML/TF Risk Assessment form with realistic answers.
 */
export const FillRiskAssessmentForm: Story = {
  args: {
    regulationId: "aml-ctf-rules",
    sectionId: "risk-assessment",
  },
  play: async ({ canvasElement }) => {
    await waitForFormLoaded(canvasElement);
    const canvas = within(canvasElement);

    // Answer 4_1_3 = "Yes" (risk factors identified and documented)
    await clickRadio(canvas, "4_1_3", "Yes");
    await fillDetail(canvas, "4_1_3", "We have documented ML/TF risk factors in our AML program");

    // Answer risk factor sub-controls
    for (const fieldId of ["4_1_3_1", "4_1_3_2", "4_1_3_3", "4_1_3_4", "4_1_3_5", "4_1_3_6", "4_1_3_7"]) {
      await clickRadio(canvas, fieldId, "Yes");
    }

    // Answer 4_1_6 = "Yes" (post-commencement customers)
    await clickRadio(canvas, "4_1_6", "Yes");

    // Click Save Progress
    await userEvent.click(canvas.getByText("Save Progress"));
  },
};

/**
 * Verifies sub-type chip selector renders for the CDD — Individuals form.
 */
export const SubTypeChips: Story = {
  args: {
    regulationId: "aml-ctf-rules",
    sectionId: "cdd-individuals",
  },
  play: async ({ canvasElement }) => {
    await waitForFormLoaded(canvasElement);
    const canvas = within(canvasElement);

    // Sub-type chips should be present
    expect(canvas.getByText("Individuals")).toBeTruthy();
    expect(canvas.getByText("Sole Traders")).toBeTruthy();

    // Switch to Sole Traders
    await userEvent.click(canvas.getByText("Sole Traders"));
  },
};

/**
 * Renders the CDD — Individuals form and fills out key controls.
 */
export const CddIndividuals: Story = {
  args: {
    regulationId: "aml-ctf-rules",
    sectionId: "cdd-individuals",
  },
  play: async ({ canvasElement }) => {
    await waitForFormLoaded(canvasElement);
    const canvas = within(canvasElement);

    const radios = canvas.getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);

    // Answer 4_2_2 (General CDD Obligation)
    await clickRadio(canvas, "4_2_2", "Yes");
    await fillDetail(canvas, "4_2_2", "We have risk-based controls for verifying customer identity");

    // Answer 4_2_3 (visible when sub-individual is active — it's the default)
    await clickRadio(canvas, "4_2_3", "Yes");

    await userEvent.click(canvas.getByText("Save Progress"));
  },
};
