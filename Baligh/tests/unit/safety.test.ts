import { describe, expect, it } from "vitest";
import { applySafetyFloor, assessSafety } from "@/lib/safety";

describe("deterministic safety rules", () => {
  it.each([
    ["سلك كهربائي مكشوف عند باب القاعة", "exposed_wiring"],
    ["فيه اسلاك عارية طالعة من الجدار", "exposed_wiring"],
    ["تسرب مياه كبير عند الأجهزة الكهربائية", "water_near_electricity"],
    ["المكيف يخر موية على الافياش", "water_near_electricity"],
    ["فيه ريحة احتراق من البروجكتر", "fire_smoke"],
    ["طالع دخان من اللوحة", "fire_smoke"],
    ["ريحة غاز قوية في المطبخ", "gas"],
    ["الفيش كهربني لما لمسته", "electric_shock"],
    ["واحد انجرح من الزجاج المكسور", "injury"],
    ["المصعد واقف وفيه ناس محبوسين", "trapped_elevator"],
  ])("flags %s as urgent", (text, flag) => {
    const r = assessSafety(text);
    expect(r.flags).toContain(flag);
    expect(r.minPriority).toBe("urgent");
    expect(r.immediateDanger).toBe(true);
  });

  it("raises a big leak without electricity to high, not urgent", () => {
    const r = assessSafety("تسريب موية قوي في دورة المياه");
    expect(r.flags).toEqual(["major_leak"]);
    expect(r.minPriority).toBe("high");
    expect(r.immediateDanger).toBe(false);
  });

  it.each(["ما فيه مناديل من الصباح", "المكيف ما يبرد", "النت ما يشتغل", "الكرسي مكسور", "البروجكتر ما يعرض"])(
    "does not flag ordinary issue: %s",
    (text) => {
      const r = assessSafety(text);
      expect(r.flags).toEqual([]);
      expect(r.minPriority).toBeNull();
    },
  );

  it("handles diacritics and letter variants", () => {
    expect(assessSafety("سِلْكٌ مَكْشُوفٌ").flags).toContain("exposed_wiring");
    expect(assessSafety("حريقة صغيرة").flags).toContain("fire_smoke");
  });

  it("does not match substrings inside unrelated words", () => {
    // "نار" must not match inside "منارة" / "دينار"
    expect(assessSafety("ضوء المنارة ضعيف").flags).toEqual([]);
  });

  it("only raises, never lowers priority", () => {
    const urgent = assessSafety("سلك مكشوف");
    expect(applySafetyFloor("low", urgent)).toBe("urgent");
    const none = assessSafety("ما فيه مناديل");
    expect(applySafetyFloor("high", none)).toBe("high");
    const high = assessSafety("تسرب كبير في الممر");
    expect(applySafetyFloor("urgent", high)).toBe("urgent");
  });

  it("considers clarification answers too", () => {
    expect(assessSafety("فيه مشكلة في القاعة", "فيه سلك مكشوف").minPriority).toBe("urgent");
  });
});
