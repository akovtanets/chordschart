import Link from "next/link";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <main className={styles.hero}>
      <h1 className={styles.title}>
        CHORDS<span>CHART</span>
      </h1>
      
      <p className={styles.subtitle}>
        Твоя база християнських пісень з акордами. 
        Створюй власні списки, шукай нове та слав Господа разом з нами.
      </p>

      <div className={styles.buttonGroup}>
        <Link href="/songs" className={styles.primaryBtn}>
          Знайти пісню
        </Link>
        <Link href="/add-song" className={styles.secondaryBtn}>
          Додати свою
        </Link>
      </div>
    </main>
  );
}