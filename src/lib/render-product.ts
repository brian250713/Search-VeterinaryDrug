import type { Product } from '../types/drug.js';
import {
  formatStatusBadge,
  formatCategoryText,
  formatRestrictionText,
  formatField,
  getSpeciesNameZh,
} from './display-helpers.js';
import { escapeHtml } from './escape-html.js';
import { ingredientUrl } from './url.js';
import { renderCompanyLink } from './product-list.js';

export function renderProduct(product: Product): string {
  const statusBadge = formatStatusBadge(product.status);
  const categoryText = formatCategoryText(product.category);

  // 失效警示 Banner
  const expiredBanner =
    product.status === 'expired'
      ? `<div style="background-color: #fee2e2; border-left: 5px solid #dc2626; color: #991b1b; padding: 1rem; border-radius: 6px; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 1.25rem;">⚠️</span>
        <span>此動物用藥品許可證已失效（過期或主管機關已公告註銷失效）</span>
      </div>`
      : '';

  const exportBadge = product.exportOnly
    ? `<span class="badge badge-warn">外銷專用</span>`
    : '';

  const nameZhDisplay = escapeHtml(formatField(product.nameZh));
  const nameEnDisplay = product.nameEn
    ? `<p style="color: #6b7280; font-size: 1.1rem; margin-top: 0.25rem;">${escapeHtml(product.nameEn)}</p>`
    : '';

  // 劑型處理
  const dosageCategory = escapeHtml(formatField(product.dosageForm?.category));
  const dosageSubcategory = product.dosageForm?.subcategory
    ? ` (${escapeHtml(product.dosageForm.subcategory)})`
    : '';
  const dosageRaw = escapeHtml(formatField(product.dosageForm?.raw));

  // 效期文字
  let expiryText = '';
  if (product.expiryDate) {
    expiryText = `至 ${escapeHtml(product.expiryDate)} 止`;
  } else if (product.status === 'unknown') {
    expiryText = '效期未載明';
  } else {
    expiryText = '已屆期';
  }

  // 成分區塊
  const isBiologic = product.category === 'biologic';
  const singleCompoundBadge = !isBiologic
    ? `<span class="badge" style="background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;">
        ${product.isSingleIngredient ? '單方藥品' : '複方藥品'}
      </span>`
    : '';

  let ingredientsHtml = '';
  if (product.ingredients && product.ingredients.length > 0) {
    const listHtml = product.ingredients
      .map((ing) => {
        const slug =
          ing.slug ||
          ing.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const cn = ing.chineseName
          ? `<span style="color: #4b5563; font-size: 0.85rem;">(${escapeHtml(ing.chineseName)})</span>`
          : '';
        const unverified = !ing.verified
          ? `<span class="badge" style="background-color: #f3f4f6; color: #9ca3af; font-size: 0.7rem;">未驗證</span>`
          : '';
        return `<a
          href="${ingredientUrl(slug)}"
          class="card"
          style="padding: 0.5rem 0.85rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;"
        >
          <span style="font-weight: 600; color: #047857;">${escapeHtml(ing.name)}</span>
          ${cn}
          ${unverified}
        </a>`;
      })
      .join('');

    ingredientsHtml = `<div style="margin-bottom: 1.25rem;">
      <h3 style="font-size: 0.9rem; color: #4b5563; margin-bottom: 0.5rem;">標準化成分索引：</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        ${listHtml}
      </div>
    </div>`;
  } else if (isBiologic) {
    ingredientsHtml = `<p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem;">
      生物製劑（疫苗等）因菌株與效價特性，不列入化學成分標準索引。
    </p>`;
  } else {
    ingredientsHtml = `<p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem;">未抽取到標準化成分。</p>`;
  }

  // 適用物種與適應症
  let speciesHtml = '';
  if (product.speciesIndications && product.speciesIndications.length > 0) {
    const spListHtml = product.speciesIndications
      .map((sp) => {
        const spNameZh = escapeHtml(getSpeciesNameZh(sp.species));
        const genericBadge = sp.generic
          ? `<span class="badge badge-generic">泛稱展開</span>`
          : '';
        const restrictionsBadge = (sp.restrictions || [])
          .map(
            (r) =>
              `<span class="badge badge-warn">⚠️ ${escapeHtml(formatRestrictionText(r))}</span>`
          )
          .join('');
        const labelText = escapeHtml(sp.label || '');
        const indicationText = escapeHtml(formatField(sp.indication));

        return `<div style="border: 1px solid var(--border); border-radius: 6px; padding: 0.85rem; background-color: #ffffff;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
            <span style="font-weight: 700; color: #111827; font-size: 1.05rem;">${spNameZh}</span>
            ${genericBadge}
            ${restrictionsBadge}
            <span style="color: #9ca3af; font-size: 0.8rem; margin-left: auto;">[字樣: ${labelText}]</span>
          </div>
          <p style="font-size: 0.95rem; color: #374151; line-height: 1.5;">
            ${indicationText}
          </p>
        </div>`;
      })
      .join('');

    speciesHtml = `<div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
      ${spListHtml}
    </div>`;
  } else {
    speciesHtml = `<p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1.5rem;">未偵測到結構化適用物種分段。</p>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      ${expiredBanner}

      <!-- 頂部卡片：產品名稱與主要標籤 -->
      <div class="card" style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1rem;">
          <div>
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <span class="${escapeHtml(statusBadge.className)}">${escapeHtml(statusBadge.text)}</span>
              <span class="badge" style="background-color: #e5e7eb; color: #374151;">${escapeHtml(product.origin)}</span>
              <span class="badge" style="background-color: #f3e8ff; color: #6b21a8;">${escapeHtml(categoryText)}</span>
              ${exportBadge}
            </div>
            <h1 style="font-size: 1.75rem; color: #111827; line-height: 1.3;">${nameZhDisplay}</h1>
            ${nameEnDisplay}
          </div>

          <button
            id="detail-compare-btn"
            class="btn btn-secondary"
            data-slug="${escapeHtml(product.slug)}"
            style="align-self: flex-start;"
          >
            ➕ 加入比較
          </button>
        </div>
      </div>

      <!-- 許可證與基本屬性 -->
      <div class="card">
        <h2 style="font-size: 1.15rem; margin-bottom: 1rem; color: #047857;">基本登記資料</h2>
        <div class="table-responsive">
          <table>
            <tbody>
              <tr>
                <th style="width: 25%;">許可證字號</th>
                <td><strong>${escapeHtml(formatField(product.licenseNo))}</strong></td>
              </tr>
              <tr>
                <th>有效狀態與期限</th>
                <td>
                  <span class="${escapeHtml(statusBadge.className)}" style="margin-right: 0.5rem;">${escapeHtml(statusBadge.text)}</span>
                  ${expiryText}
                </td>
              </tr>
              <tr>
                <th>核發日期</th>
                <td>${escapeHtml(formatField(product.issueDate))}</td>
              </tr>
              <tr>
                <th>劑型</th>
                <td>
                  <strong>${dosageCategory}</strong>
                  ${dosageSubcategory}
                  <span style="color: #9ca3af; font-size: 0.85rem; margin-left: 0.5rem;">[原文：${dosageRaw}]</span>
                </td>
              </tr>
              <tr>
                <th>包裝規格</th>
                <td>${escapeHtml(formatField(product.package))}</td>
              </tr>
              <tr>
                <th>申請業者</th>
                <td>
                  <div><strong>${renderCompanyLink(product.vendorName)}</strong></div>
                  <div style="color: #6b7280; font-size: 0.85rem;">${escapeHtml(formatField(product.vendorAddress))}</div>
                </td>
              </tr>
              <tr>
                <th>製造廠</th>
                <td>
                  <div><strong>${renderCompanyLink(product.factoryName)}</strong></div>
                  <div style="color: #6b7280; font-size: 0.85rem;">${escapeHtml(formatField(product.factoryAddress))}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 成分資訊區塊 -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="font-size: 1.15rem; color: #047857;">成份內容</h2>
          ${singleCompoundBadge}
        </div>

        ${ingredientsHtml}

        <!-- 原文 -->
        <div>
          <h3 style="font-size: 0.9rem; color: #4b5563; margin-bottom: 0.5rem;">登記成分原文：</h3>
          <pre style="background-color: #f9fafb; border: 1px solid var(--border); padding: 0.85rem; border-radius: 6px; font-family: inherit; font-size: 0.9rem; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(formatField(product.ingredientsText))}</pre>
        </div>
      </div>

      <!-- 物種適應症與限制 -->
      <div class="card">
        <h2 style="font-size: 1.15rem; margin-bottom: 1rem; color: #047857;">適用物種與適應症</h2>
        ${speciesHtml}

        <div>
          <h3 style="font-size: 0.9rem; color: #4b5563; margin-bottom: 0.5rem;">適應症登記全文：</h3>
          <div style="background-color: #f9fafb; border: 1px solid var(--border); padding: 0.85rem; border-radius: 6px; font-size: 0.9rem; white-space: pre-wrap; line-height: 1.5;">
            ${escapeHtml(formatField(product.indicationText))}
          </div>
        </div>
      </div>
    </div>
  `;
}
