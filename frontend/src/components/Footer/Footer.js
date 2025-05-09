import styles from './Footer.module.scss';
function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerLeft}>
          <img src="/img/vos_logo.png" alt="Logo" className={styles.footerLogo} />
          <p>&copy; {new Date().getFullYear()} Voice of the Shopper. All Rights Reserved.</p>
        </div>
        <div className={styles.footerRight}>
          <p>Contact Us: <a href="mailto:contact@vos.com">contact@vos.com</a></p>
          <div className={styles.socialIcons}>
            <a href="#" className={styles.socialIcon}>Facebook</a>
            <a href="#" className={styles.socialIcon}>Twitter</a>
            <a href="#" className={styles.socialIcon}>LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
