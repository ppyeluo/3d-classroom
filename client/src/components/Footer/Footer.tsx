import { Link } from 'react-router-dom';
import './Footer.scss';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer__container">
        {/* 左侧统计信息 */}
        <div className="footer__stats">
          <p>已帮助 10000 + 教师创建 3D 教学模型</p>
        </div>

        {/* 中间链接区域 */}
        <div className="footer__links">
          <Link to="/help" className="footer__link">使用帮助</Link>
          <Link to="/contact" className="footer__link">联系我们</Link>
          <Link to="/privacy" className="footer__link">隐私政策</Link>
          <Link to="/terms" className="footer__link">服务条款</Link>
        </div>

        {/* 右侧版权信息 */}
        <div className="footer__copyright">
          <p>© 2024 立体课堂. 保留所有权利</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;